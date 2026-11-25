export type LabelCopy = {
  rma: string;
  orderNumber: string;
  customerName: string;
  city: string;
  region: string;
  country: string;
  items: string[];
  carrier: string;
};

function escapePdf(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildLabelPdf(label: LabelCopy): Uint8Array {
  const lines = [
    "DRIFTWOOD OUTFITTERS",
    "Simulated return label",
    `RMA  ${label.rma}`,
    `Order  ${label.orderNumber}`,
    label.customerName,
    `${label.city}, ${label.region}  ${label.country}`,
    "Ship to: Driftwood Returns",
    "410 Harbor Yard, Grayhaven, OR 97000",
    ...label.items.map((item) => `Item  ${item}`),
    `${label.carrier}  —  prepaid demo label`,
    "Not a real carrier document. Portfolio demo only.",
  ];
  const commands = ["BT", "/F1 12 Tf"];
  let y = 740;
  lines.forEach((line, index) => {
    const size = index === 0 ? 18 : 12;
    commands.push(`/F1 ${size} Tf`);
    commands.push(`1 0 0 1 48 ${y} Tm (${escapePdf(line)}) Tj`);
    y -= index === 0 ? 32 : 20;
  });
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf));
}
