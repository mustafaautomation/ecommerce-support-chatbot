import type { Product } from "@/lib/types";

export const PRODUCTS: Product[] = [
  {
    sku: "SHELL-CEDAR",
    name: "Cedar Rain Shell",
    priceCents: 18900,
    category: "shells",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Kelp", "Fog"],
    material: "3-layer recycled nylon, 20k/20k membrane",
    finalSale: false,
    blurb:
      "A hardshell for harbor weather and ridge wind. Helmet-compatible hood and pit zips.",
    tags: ["rain", "jacket", "waterproof", "shell", "hardshell", "storm"],
  },
  {
    sku: "FLEECE-HARBOR",
    name: "Harbor Fleece",
    priceCents: 12800,
    category: "fleece",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Driftwood", "Ink"],
    material: "Polartec fleece, 260 gsm",
    finalSale: false,
    blurb: "A midlayer that still looks like a jacket at the ferry dock.",
    tags: ["fleece", "midlayer", "warm", "jacket"],
  },
  {
    sku: "BEANIE-TRAIL",
    name: "Trail Wool Beanie",
    priceCents: 3800,
    category: "beanies",
    sizes: ["OS"],
    colors: ["Kelp", "Sand"],
    material: "Merino wool",
    finalSale: false,
    blurb: "One size, 21 to 24 inch heads. Folded cuff, no itch.",
    tags: ["beanie", "hat", "wool", "merino"],
  },
  {
    sku: "CREW-MERINO",
    name: "Summit Merino Crew",
    priceCents: 7800,
    category: "tops",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Oat", "Tide"],
    material: "100% merino, 165 gsm",
    finalSale: false,
    blurb: "A next-to-skin crew for trail days that start cold.",
    tags: ["merino", "shirt", "base layer", "wool"],
  },
  {
    sku: "PANT-DRIFT",
    name: "Drift Pant",
    priceCents: 11800,
    category: "pants",
    sizes: ["28", "30", "32", "34", "36", "38"],
    colors: ["Stone", "Kelp"],
    material: "Stretch cotton canvas",
    finalSale: false,
    blurb: "A trail pant with a real pocket layout and a cuff that clears boots.",
    tags: ["pant", "pants", "trail", "hiking"],
  },
  {
    sku: "VEST-FOGLINE",
    name: "Fogline Down Vest",
    priceCents: 16800,
    category: "insulation",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Fog", "Copper"],
    material: "700-fill recycled down, 20d shell",
    finalSale: false,
    blurb: "Light insulation for the boat deck and the trailhead.",
    tags: ["down", "vest", "warm", "insulation"],
  },
  {
    sku: "SHORT-KELP",
    name: "Kelp Swim Short",
    priceCents: 6400,
    category: "swim",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Kelp"],
    material: "Recycled nylon, quick dry",
    finalSale: true,
    blurb: "A 7-inch swim short. Final sale, like the rest of the swim line.",
    tags: ["swim", "short", "final sale"],
  },
  {
    sku: "SOCK-SUMMIT",
    name: "Summit Socks 3-pack",
    priceCents: 2400,
    category: "socks",
    sizes: ["OS"],
    colors: ["Oat"],
    material: "Merino blend",
    finalSale: true,
    blurb: "Crew socks. Final sale once they leave the warehouse.",
    tags: ["socks", "sock", "merino", "final sale"],
  },
  {
    sku: "SHOE-RIDGE",
    name: "Ridge Approach Shoe",
    priceCents: 14800,
    category: "footwear",
    sizes: ["7", "8", "9", "10", "11", "12", "13"],
    colors: ["Stone"],
    material: "Suede and recycled mesh",
    finalSale: false,
    blurb: "A sticky approach shoe for wet rock and gravel bars.",
    tags: ["shoe", "approach", "footwear", "boot"],
  },
  {
    sku: "TOTE-TIDE",
    name: "Tidepool Tote",
    priceCents: 5400,
    category: "bags",
    sizes: ["OS"],
    colors: ["Sand"],
    material: "Waxed canvas",
    finalSale: false,
    blurb: "A waxed tote that stands up on the dock and folds flat at home.",
    tags: ["tote", "bag", "canvas"],
  },
  {
    sku: "PARKA-NORTH",
    name: "Northline Parka",
    priceCents: 42000,
    category: "shells",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Ink"],
    material: "Waterproof shell, synthetic insulation",
    finalSale: false,
    blurb:
      "Our warmest coat. High-value piece — damage and missing-parcel claims go to a person.",
    tags: ["parka", "jacket", "winter", "coat", "waterproof"],
  },
  {
    sku: "BIB-STORM",
    name: "Stormwatch Bib",
    priceCents: 26000,
    category: "pants",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["Kelp"],
    material: "Waterproof bib, recycled nylon",
    finalSale: false,
    blurb: "A bib for wet ridgelines. Seams are covered by the lifetime warranty.",
    tags: ["bib", "rain", "pant", "waterproof"],
  },
];

export function productBySku(sku: string): Product | undefined {
  return PRODUCTS.find((product) => product.sku === sku);
}

export function searchProducts(query: string, limit = 3): Product[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
  const scored = PRODUCTS.map((product) => {
    const hay = [
      product.name,
      product.category,
      product.material,
      product.blurb,
      product.tags.join(" "),
    ]
      .join(" ")
      .toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (hay.includes(token)) score += token.length > 4 ? 2 : 1;
    }
    if (query.toLowerCase().includes(product.name.toLowerCase())) score += 5;
    return { product, score };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((row) => row.product);
}
