import { parseQrPayloadToBusinessCard } from "./businessCardQrService";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const vCard = [
  "BEGIN:VCARD",
  "FN:Sandra Lorido",
  "ORG:Strong Bull Maquinaria S.L.",
  "TITLE:Export Manager",
  "TEL;TYPE=WORK:+34981699140",
  "EMAIL:sandra@strongbull.es",
  "URL:www.strongbull.es",
  "ADR:;;Calle Guris nave 1;Trazo;A Coruna;15687;Espana",
  "END:VCARD",
].join("\n");

const parsedVCard = parseQrPayloadToBusinessCard(vCard);
assert(parsedVCard?.contactNameAndSurname === "Sandra Lorido", "vCard name should be parsed");
assert(parsedVCard?.customerName === "Strong Bull Maquinaria S.L.", "vCard company should be parsed");
assert(parsedVCard?.phone1 === "+34981699140", "vCard phone should be parsed");

const mecard = "MECARD:N:Lorido,Sandra;ORG:Strong Bull Maquinaria S.L.;TEL:+34981699140;EMAIL:sandra@strongbull.es;URL:www.strongbull.es;;";
const parsedMecard = parseQrPayloadToBusinessCard(mecard);
assert(parsedMecard?.contactNameAndSurname === "Sandra Lorido", "MECARD name should be parsed");
assert(parsedMecard?.website === "www.strongbull.es", "MECARD website should be parsed");

const parsedUrl = parseQrPayloadToBusinessCard("https://strongbull.es");
assert(parsedUrl?.website === "https://strongbull.es", "URL QR should map to website");

console.log("businessCardQrService test passed");
