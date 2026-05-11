/// <reference lib="webworker" />

export function ndJsonTransformStream<R>(): TransformStream<string, R> {
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