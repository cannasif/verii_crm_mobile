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
  "ROLE:Sales Division Manager",
  "TEL;TYPE=CELL:+34981699140",
  "TEL;TYPE=WORK,VOICE:+34981222000",
  "TEL;TYPE=FAX:+34981999000",
  "EMAIL:sandra@strongbull.es",
  "URL:www.strongbull.es",
  "ADR:;;Calle Guris nave 1;Trazo;A Coruna;15687;Espana",
  "LANG:es",
  "IMPP:skype:sandra.lorido",
  "PHOTO:https://strongbull.es/photo.jpg",
  "NOTE:Key account for Iberia",
  "END:VCARD",
].join("\n");

const parsedVCard = parseQrPayloadToBusinessCard(vCard);
assert(parsedVCard?.contactNameAndSurname === "Sandra Lorido", "vCard name should be parsed");
assert(parsedVCard?.customerName === "Strong Bull Maquinaria S.L.", "vCard company should be parsed");
assert(parsedVCard?.phone1 === "+34981699140", "vCard mobile should be preferred");
assert(parsedVCard?.phone2 === "+34981222000", "vCard work phone should be secondary");
assert(parsedVCard?.title === "Export Manager / Sales Division Manager", "vCard role should extend title");
assert(parsedVCard?.address === "Calle Guris nave 1, Trazo, A Coruna, 15687, Espana", "vCard ADR should be expanded");
assert(parsedVCard?.countryName === "Espana", "vCard country should be mapped");
assert(parsedVCard?.districtName === "Trazo", "vCard locality should be mapped");
assert(parsedVCard?.cityName === "A Coruna", "vCard region should be mapped");
assert(parsedVCard?.notes?.includes("Fax: +34981999000"), "vCard fax should be moved to notes");
assert(parsedVCard?.notes?.includes("Language: es"), "vCard language should be preserved in notes");
assert(parsedVCard?.notes?.includes("IMPP: skype:sandra.lorido"), "vCard IMPP should be preserved in notes");
assert(parsedVCard?.notes?.includes("PHOTO: https://strongbull.es/photo.jpg"), "vCard photo should be preserved in notes");

const mecard = "MECARD:N:Lorido,Sandra;ORG:Strong Bull Maquinaria S.L.;TITLE:Export Manager;ROLE:Key Account;TEL:+34981699140;EMAIL:sandra@strongbull.es;URL:www.strongbull.es;NOTE:Priority lead;LANG:es;;";
const parsedMecard = parseQrPayloadToBusinessCard(mecard);
assert(parsedMecard?.contactNameAndSurname === "Sandra Lorido", "MECARD name should be parsed");
assert(parsedMecard?.website === "www.strongbull.es", "MECARD website should be parsed");
assert(parsedMecard?.title === "Export Manager / Key Account", "MECARD role should extend title");
assert(parsedMecard?.notes?.includes("Priority lead"), "MECARD note should be parsed");

const parsedUrl = parseQrPayloadToBusinessCard("https://strongbull.es");
assert(parsedUrl?.website === "https://strongbull.es", "URL QR should map to website");

console.log("businessCardQrService test passed");
