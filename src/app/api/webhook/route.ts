import OpenAI from "openai";
import { and, eq, not } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import {
  MessageNewEvent,
  CallEndedEvent,
  CallTranscriptionReadyEvent,
  CallSessionParticipantLeftEvent,
  CallRecordingReadyEvent,
  CallSessionStartedEvent,
} from "@stream-io/node-sdk";
import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";
import { inngest } from "@/inngest/client";
import { generateAvatarUri } from "@/lib/avatar";
import { streamChat } from "@/lib/stream-chat";

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function verifySignatureWithSDK(body: string, signature: string): boolean {
  return streamVideo.verifyWebhook(body, signature);
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature");
  const apiKey = req.headers.get("x-api-key");

  console.log("Webhook Headers:", { signature, apiKey });

  if (!signature || !apiKey) {
    console.log("Missing signature or API key");
    return NextResponse.json(
      { error: "Missing signature or API key" },
      { status: 400 }
    );
  }

  const body = await req.text();
  console.log("Webhook Body:", body);

  if (!verifySignatureWithSDK(body, signature)) {
    console.log("Signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch (error) {
    console.log("JSON parsing error:", error);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = (payload as Record<string, unknown>)?.type;
  console.log("Event Type:", eventType);

  if (eventType === "call.session_started") {
    const event = payload as CallSessionStartedEvent;
    const meetingId = event.call.custom?.meetingId;
    console.log("Meeting ID:", meetingId);

    if (!meetingId) {
      console.log("Missing meetingId in event payload");
      return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
    }

    const [existingMeeting] = await db
      .select()
      .from(meetings)
      .where(
        and(
          eq(meetings.id, meetingId), // Assuming meetingId is a string
          not(eq(meetings.status, "completed")),
          not(eq(meetings.status, "active")),
          not(eq(meetings.status, "cancelled")),
          not(eq(meetings.status, "processing"))
        )
      );
    console.log("Existing Meeting:", existingMeeting);

    if (!existingMeeting) {
      console.log("Meeting not found for ID:", meetingId);
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    await db
      .update(meetings)
      .set({ status: "active", startedAt: new Date() })
      .where(eq(meetings.id, existingMeeting.id));

    const [existingAgent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, existingMeeting.agentId));
    console.log("Existing Agent:", existingAgent);

    if (!existingAgent) {
      console.log("Agent not found for ID:", existingMeeting.agentId);
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const call = streamVideo.video.call("default", meetingId);
    console.log("Stream Call Object:", call);

    console.log("OpenAI API Key (exists):", !!process.env.OPENAI_API_KEY);
    try {
      const realtimeClient = await streamVideo.video.connectOpenAi({
        call,
        openAiApiKey: process.env.OPENAI_API_KEY!,
        agentUserId: existingAgent.id,
      });
      console.log("OpenAI Connection Successful:", realtimeClient);
      realtimeClient.updateSession({
        instructions: existingAgent.instructions,
      });
      console.log("OpenAI Session Updated");
    } catch (error) {
      console.error("OpenAI Connection Error:", error);
      return NextResponse.json(
        {
          error: "Failed to connect to OpenAI",
          details: (error as Error).message,
        },
        { status: 500 }
      );
    }
  } else if (eventType === "call.session_participant_left") {
    const event = payload as CallSessionParticipantLeftEvent;
    const meetingId = event.call_cid.split(":")[1];
    console.log("Participant Left Meeting ID:", meetingId);

    if (!meetingId) {
      console.log("Missing meetingId in call.session_participant_left");
      return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
    }
    const call = streamVideo.video.call("default", meetingId);
    await call.end();
    console.log("Call Ended for Meeting ID:", meetingId);
  } else if (eventType === "call.session_ended") {
    const event = payload as CallEndedEvent;
    const meetingId = event.call.custom?.meetingId;

    if (!meetingId) {
      return NextResponse.json({ error: "Missing meetingId" }, { status: 400 });
    }

    await db
      .update(meetings)
      .set({
        status: "processing",
        endedAt: new Date(),
      })
      .where(and(eq(meetings.id, meetingId), eq(meetings.status, "active")));
  } else if (eventType === "call.transcription_ready") {
    const event = payload as CallTranscriptionReadyEvent;
    const meetingId = event.call_cid.split(":")[1];

    const [updatedMeeting] = await db
      .update(meetings)
      .set({
        transcriptUrl: event.call_transcription.url,
      })
      .where(eq(meetings.id, meetingId))
      .returning();

    if (!updatedMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    await inngest.send({
      name: "meetings/processing",
      data: {
        meetingId: updatedMeeting.id,
        transcriptUrl: updatedMeeting.transcriptUrl,
      },
    });
  } else if (eventType === "call.recording_ready") {
    const event = payload as CallRecordingReadyEvent;
    const meetingId = event.call_cid.split(":")[1];

    await db
      .update(meetings)
      .set({
        recordingUrl: event.call_recording.url,
      })
      .where(eq(meetings.id, meetingId));
  } else if (eventType === "message.new") {
    const event = payload as MessageNewEvent;
    const userId = event.user?.id;
    const channelId = event.channel_id;
    const text = event.message?.text;

    if (!userId || !channelId || !text) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let existingMeeting;
    try {
      const meetingResult = await db
        .select()
        .from(meetings)
        .where(
          and(eq(meetings.id, channelId), eq(meetings.status, "completed"))
        );
      if (meetingResult.length === 0) {
        return NextResponse.json(
          { error: "Meeting not found" },
          { status: 404 }
        );
      }
      existingMeeting = meetingResult[0];
    } catch (error) {
      console.error("Database query failed for meeting:", error);
      return NextResponse.json(
        { error: "Database error while fetching meeting" },
        { status: 500 }
      );
    }

    let existingAgent;
    try {
      const agentResult = await db
        .select()
        .from(agents)
        .where(eq(agents.id, existingMeeting.agentId));
      if (agentResult.length === 0) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
      existingAgent = agentResult[0];
    } catch (error) {
      console.error("Database query failed for agent:", error);
      return NextResponse.json(
        { error: "Database error while fetching agent" },
        { status: 500 }
      );
    }

    if (userId !== existingAgent.id) {
      const instructions = `
        You are an AI assistant helping the user revisit a recently completed meeting.
        Below is a summary of the meeting, generated from the transcript:
        
        ${existingMeeting.summary}
        
        The following are your original instructions from the live meeting assistant. Please continue to follow these behavioral guidelines as you assist the user:
        
        ${existingAgent.instructions}
        
        The user may ask questions about the meeting, request clarifications, or ask for follow-up actions.
        Always base your responses on the meeting summary above.
        
        You also have access to the recent conversation history between you and the user. Use the context of previous messages to provide relevant, coherent, and helpful responses. If the user's question refers to something discussed earlier, make sure to take that into account and maintain continuity in the conversation.
        
        If the summary does not contain enough information to answer a question, politely let the user know.
        
        Be concise, helpful, and focus on providing accurate information from the meeting and the ongoing conversation.
      `;

      let channel;
      try {
        channel = streamChat.channel("messaging", channelId);
        await channel.watch();
      } catch (error) {
        console.error("Failed to watch channel:", error);
        return NextResponse.json(
          { error: "Failed to watch channel" },
          { status: 500 }
        );
      }

      const previousMessages = channel.state.messages
        .slice(-5)
        .filter((msg) => typeof msg.text === "string" && msg.text.trim() !== "")
        .map<ChatCompletionMessageParam>((message) => ({
          role: message.user?.id === existingAgent.id ? "assistant" : "user",
          content: message.text || "",
        }));

      let GPTResponse;
      try {
        GPTResponse = await openaiClient.chat.completions.create({
          messages: [
            { role: "system", content: instructions },
            ...previousMessages,
            { role: "user", content: text },
          ],
          model: process.env.OPENAI_MODEL || "gpt-4o",
        });
      } catch (error) {
        console.error("OpenAI API error:", error);
        return NextResponse.json(
          { error: "Failed to get response from GPT" },
          { status: 500 }
        );
      }

      if (!GPTResponse.choices?.[0]?.message?.content) {
        return NextResponse.json(
          { error: "No valid response from GPT" },
          { status: 500 }
        );
      }
      const GPTResponseText = GPTResponse.choices[0].message.content;

      const avatarUrl = generateAvatarUri({
        seed: existingAgent.name,
        variant: "botttsNeutral",
      });

      try {
        await streamChat.upsertUser({
          id: existingAgent.id,
          name: existingAgent.name,
          image: avatarUrl,
        });

        await channel.sendMessage({
          text: GPTResponseText,
          user: {
            id: existingAgent.id,
            name: existingAgent.name,
            image: avatarUrl,
          },
        });
      } catch (error) {
        console.error("Stream Chat error:", error);
        return NextResponse.json(
          { error: "Failed to send message" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: "Message sent successfully" },
        { status: 200 }
      );
    }
  }
}
