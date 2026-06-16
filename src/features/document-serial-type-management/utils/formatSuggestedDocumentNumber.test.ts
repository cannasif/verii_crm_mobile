import { formatSuggestedDocumentNumber } from "./formatSuggestedDocumentNumber";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const formatted = formatSuggestedDocumentNumber({
  id: 1,
  serialPrefix: "GEN",
  serialCurrent: 133,
  serialLength: 12,
  serialIncrement: 1,
});

assert(formatted.startsWith("GEN"), "prefix should be included");
assert(formatted.includes(String(new Date().getFullYear())), "year should be included");
assert(formatted.endsWith("000000000134"), "counter should be padded and incremented");

console.log("formatSuggestedDocumentNumber.test.ts passed");
