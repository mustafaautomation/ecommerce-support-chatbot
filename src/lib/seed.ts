import type { Store } from "@/lib/db";
import { daysAgo, daysFromNow } from "@/lib/format";
import type { OrderItem, OrderStatus, ShipmentEvent } from "@/lib/types";

type SeedOrder = {
  number: string;
  email: string;
  customerName: string;
  status: OrderStatus;
  placedDaysAgo: number;
  deliveredDaysAgo?: number;
  promisedDaysAgo?: number;
  promisedInDays?: number;
  shippingMethod: string;
  city: string;
  region: string;
  country: string;
  postal: string;
  paymentMethod: string;
  trackingNumber?: string;
  carrier?: string;
  items: OrderItem[];
};

function line(
  orderNumber: string,
  index: number,
  sku: string,
  name: string,
  size: string,
  priceCents: number,
  finalSale = false,
): OrderItem {
  return {
    id: `${orderNumber}-${index}`,
    sku,
    name,
    size,
    qty: 1,
    priceCents,
    finalSale,
  };
}

function eventsFor(order: SeedOrder): ShipmentEvent[] {
  if (order.status === "processing" || order.status === "cancelled") return [];
  const placed = daysAgo(order.placedDaysAgo, 16);
  const steps: ShipmentEvent[] = [
    {
      at: placed,
      code: "label_created",
      label: "Label created",
      location: "Grayhaven, OR",
      detail: "Driftwood warehouse printed a Northline Freight label.",
    },
    {
      at: daysAgo(order.placedDaysAgo - 0.2, 20),
      code: "picked_up",
      label: "Picked up",
      location: "Grayhaven, OR",
      detail: "Northline scanned the parcel at the Harbor Yard dock.",
    },
  ];
  if (order.country === "Canada") {
    steps.push({
      at: daysAgo(Math.max(order.placedDaysAgo - 1, 1), 15),
      code: "in_transit",
      label: "In transit",
      location: "Blaine, WA",
      detail: "Cleared the US outbound scan. Duties are unpaid and due on delivery.",
    });
    steps.push({
      at: daysAgo(Math.max(order.placedDaysAgo - 2, 0.4), 18),
      code: "in_transit",
      label: "Crossing into Canada",
      location: "Surrey, BC",
      detail: "The parcel is with the Canadian partner carrier.",
    });
    return steps;
  }
  steps.push({
    at: daysAgo(Math.max(order.placedDaysAgo - 1, 1), 11),
    code: "in_transit",
    label: "Arrived at regional hub",
    location: `${order.city}, ${order.region}`,
    detail: "Sorted at the regional hub.",
  });
  if (order.status === "shipped") return steps;
  steps.push({
    at: daysAgo(Math.max((order.deliveredDaysAgo ?? 1) + 0.4, 0.3), 8),
    code: "out_for_delivery",
    label: "Out for delivery",
    location: `${order.city}, ${order.region}`,
    detail: "On the local van.",
  });
  if (order.status === "out_for_delivery") return steps;
  steps.push({
    at: daysAgo(order.deliveredDaysAgo ?? 1, 19),
    code: "delivered",
    label: "Delivered",
    location: `${order.city}, ${order.region}`,
    detail: "Left at the front door. Signed for by the household.",
  });
  return steps;
}

const ORDERS: SeedOrder[] = [
  {
    number: "DW-10482",
    email: "maya.chen@example.com",
    customerName: "Maya Chen",
    status: "delivered",
    placedDaysAgo: 9,
    deliveredDaysAgo: 6,
    promisedDaysAgo: 7,
    shippingMethod: "Drift Ground",
    city: "Portland",
    region: "OR",
    country: "US",
    postal: "97214",
    paymentMethod: "Visa ••42",
    trackingNumber: "NL-8842193",
    carrier: "Northline Freight",
    items: [
      line("DW-10482", 1, "SHELL-CEDAR", "Cedar Rain Shell", "M", 18900),
      line("DW-10482", 2, "BEANIE-TRAIL", "Trail Wool Beanie", "OS", 3800),
      line("DW-10482", 3, "SOCK-SUMMIT", "Summit Socks 3-pack", "OS", 2400, true),
    ],
  },
  {
    number: "DW-10411",
    email: "jordan.hale@example.com",
    customerName: "Jordan Hale",
    status: "processing",
    placedDaysAgo: 1,
    promisedInDays: 5,
    shippingMethod: "Harbor Air",
    city: "Bend",
    region: "OR",
    country: "US",
    postal: "97701",
    paymentMethod: "Mastercard ••19",
    items: [
      line("DW-10411", 1, "FLEECE-HARBOR", "Harbor Fleece", "L", 12800),
      line("DW-10411", 2, "PANT-DRIFT", "Drift Pant", "32", 11800),
    ],
  },
  {
    number: "DW-10390",
    email: "sam.okonkwo@example.com",
    customerName: "Sam Okonkwo",
    status: "out_for_delivery",
    placedDaysAgo: 3,
    promisedInDays: 1,
    shippingMethod: "Drift Ground",
    city: "Seattle",
    region: "WA",
    country: "US",
    postal: "98102",
    paymentMethod: "Drift Pay",
    trackingNumber: "NL-7712044",
    carrier: "Northline Freight",
    items: [line("DW-10390", 1, "VEST-FOGLINE", "Fogline Down Vest", "M", 16800)],
  },
  {
    number: "DW-10220",
    email: "priya.nair@example.com",
    customerName: "Priya Nair",
    status: "delivered",
    placedDaysAgo: 52,
    deliveredDaysAgo: 48,
    promisedDaysAgo: 47,
    shippingMethod: "Drift Ground",
    city: "Boise",
    region: "ID",
    country: "US",
    postal: "83702",
    paymentMethod: "Visa ••77",
    trackingNumber: "NL-6601180",
    carrier: "Northline Freight",
    items: [line("DW-10220", 1, "CREW-MERINO", "Summit Merino Crew", "M", 7800)],
  },
  {
    number: "DW-10770",
    email: "elena.voss@example.com",
    customerName: "Elena Voss",
    status: "delivered",
    placedDaysAgo: 4,
    deliveredDaysAgo: 1,
    promisedDaysAgo: 1,
    shippingMethod: "Harbor Air",
    city: "Juneau",
    region: "AK",
    country: "US",
    postal: "99801",
    paymentMethod: "Amex ••03",
    trackingNumber: "NL-9904412",
    carrier: "Northline Freight",
    items: [line("DW-10770", 1, "PARKA-NORTH", "Northline Parka", "M", 42000)],
  },
  {
    number: "DW-10088",
    email: "avery.quinn@example.com",
    customerName: "Avery Quinn",
    status: "delivered",
    placedDaysAgo: 24,
    deliveredDaysAgo: 20,
    promisedDaysAgo: 19,
    shippingMethod: "Drift Ground",
    city: "Eugene",
    region: "OR",
    country: "US",
    postal: "97401",
    paymentMethod: "PayPal",
    trackingNumber: "NL-5521904",
    carrier: "Northline Freight",
    items: [
      {
        ...line("DW-10088", 1, "PANT-DRIFT", "Drift Pant", "30", 11800),
        returnedRma: "RMA-1008",
      },
    ],
  },
  {
    number: "DW-10802",
    email: "noah.ellis@example.com",
    customerName: "Noah Ellis",
    status: "delivered",
    placedDaysAgo: 12,
    deliveredDaysAgo: 2,
    promisedDaysAgo: 8,
    shippingMethod: "Drift Ground",
    city: "Spokane",
    region: "WA",
    country: "US",
    postal: "99201",
    paymentMethod: "Visa ••64",
    trackingNumber: "NL-4417781",
    carrier: "Northline Freight",
    items: [line("DW-10802", 1, "FLEECE-HARBOR", "Harbor Fleece", "M", 12800)],
  },
  {
    number: "DW-10601",
    email: "camille.bergeron@example.com",
    customerName: "Camille Bergeron",
    status: "shipped",
    placedDaysAgo: 4,
    promisedInDays: 5,
    shippingMethod: "Canada Standard",
    city: "Vancouver",
    region: "BC",
    country: "Canada",
    postal: "V6B 1A1",
    paymentMethod: "Mastercard ••28",
    trackingNumber: "NL-3309127",
    carrier: "Northline Freight",
    items: [
      line("DW-10601", 1, "TOTE-TIDE", "Tidepool Tote", "OS", 5400),
      line("DW-10601", 2, "SHORT-KELP", "Kelp Swim Short", "M", 6400, true),
    ],
  },
];

export function seedDatabase(store: Store) {
  store.exec("BEGIN");
  try {
    for (const order of ORDERS) {
      const items = order.items;
      const total = items.reduce((sum, item) => sum + item.priceCents * item.qty, 0);
      const deliveredAt =
        order.deliveredDaysAgo === undefined ? null : daysAgo(order.deliveredDaysAgo, 19);
      const promisedAt =
        order.promisedDaysAgo !== undefined
          ? daysAgo(order.promisedDaysAgo, 19)
          : order.promisedInDays !== undefined
            ? daysFromNow(order.promisedInDays, 19)
            : null;
      store.run(
        `INSERT INTO orders (
          number, email, customer_name, status, placed_at, delivered_at, promised_at,
          shipping_method, city, region, country, postal, payment_method,
          tracking_number, carrier, total_cents, items_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.number,
          order.email,
          order.customerName,
          order.status,
          daysAgo(order.placedDaysAgo, 15),
          deliveredAt,
          promisedAt,
          order.shippingMethod,
          order.city,
          order.region,
          order.country,
          order.postal,
          order.paymentMethod,
          order.trackingNumber ?? null,
          order.carrier ?? null,
          total,
          JSON.stringify(items),
        ],
      );
      for (const event of eventsFor(order)) {
        store.run(
          `INSERT INTO shipment_events (order_number, at, code, label, location, detail)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [order.number, event.at, event.code, event.label, event.location, event.detail],
        );
      }
    }

    store.run(
      `INSERT INTO returns (
        rma, order_number, email, items_json, reason, kind, replacement_size, status,
        label_fee_cents, refund_cents, created_at, received_at, refund_issued_at, conversation_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "RMA-1008",
        "DW-10088",
        "avery.quinn@example.com",
        JSON.stringify([line("DW-10088", 1, "PANT-DRIFT", "Drift Pant", "30", 11800)]),
        "too_large",
        "return",
        null,
        "refund_issued",
        795,
        11800 - 795,
        daysAgo(8, 17),
        daysAgo(3, 16),
        daysAgo(1, 15),
        null,
      ],
    );
    store.run("INSERT INTO meta (key, value) VALUES (?, ?)", ["rma", "2400"]);
    store.run("INSERT INTO meta (key, value) VALUES (?, ?)", ["ticket", "1100"]);
    store.exec("COMMIT");
  } catch (error) {
    store.exec("ROLLBACK");
    throw error;
  }
}
