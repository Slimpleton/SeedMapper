/// <reference lib="webworker" />

function ndJsonTransformStream<R>(): TransformStream<string, R> {
  let leftover = '';
  return new TransformStream<string, R>({
    transform(chunk, controller) {
      const searchStr = leftover + chunk;
      let start = 0;
      let newLineIndex;
      while ((newLineIndex = searchStr.indexOf('\n', start)) !== -1) {
        const line = searchStr.slice(start, newLineIndex);
        start = newLineIndex + 1;
        if (!line.trim()) continue;
        controller.enqueue(JSON.parse(line) as R);
      }
      leftover = searchStr.slice(start);
    },
    flush(controller) {
      const line = leftover.trim();
      if (!line) return;
      controller.enqueue(JSON.parse(line) as R);
    }
  });
}

addEventListener('message', async ({ data: url }: MessageEvent<string>) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      postMessage({ error: `${response.status} | ${response.statusText}` });
      return;
    }

    if (!response.body) {
      postMessage({ error: 'Response body is null' });
      return;
    }

    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(ndJsonTransformStream())
      .getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        postMessage({ done: true });
        break;
      }
      postMessage({ batch: value });
    }
  } catch (err) {
    postMessage({ error: String(err) });
  }
});