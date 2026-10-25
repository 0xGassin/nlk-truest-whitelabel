/**
 * Reads a text/event-stream body and passes each event's data to onData.
 *
 * EventSource cannot send an Authorization header, so streams that need one
 * are read with fetch and parsed here. Only the data field is used: its lines
 * are joined with newlines and an event ends at a blank line.
 */
export async function readEventStream(
  body: ReadableStream<Uint8Array>,
  onData: (data: string) => void,
): Promise<void> {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let data: string[] = [];

  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;

    buffer += value;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line === "") {
        if (data.length > 0) onData(data.join("\n"));
        data = [];
      } else if (line.startsWith("data:")) {
        data.push(line.slice(5).replace(/^ /, ""));
      }
    }
  }
}
