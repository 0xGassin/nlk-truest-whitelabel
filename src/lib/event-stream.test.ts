import { describe, expect, it } from "vitest";

import { readEventStream } from "./event-stream";

/** A body that arrives in the given chunks, as a network stream would. */
function body(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function read(...chunks: string[]): Promise<string[]> {
  const events: string[] = [];
  await readEventStream(body(...chunks), (data) => events.push(data));
  return events;
}

describe("readEventStream", () => {
  it("emits the data of each event", async () => {
    expect(await read('data: {"id":"a"}\n\ndata: {"id":"b"}\n\n')).toEqual(['{"id":"a"}', '{"id":"b"}']);
  });

  it("joins events split across chunks and multi-line data", async () => {
    expect(await read("data: one\r", "\ndata: two\n", "\n")).toEqual(["one\ntwo"]);
  });

  it("ignores comments, other fields and an unterminated event", async () => {
    expect(await read(": keep-alive\n\nevent: update\nid: 1\ndata: x\n\ndata: partial")).toEqual(["x"]);
  });
});
