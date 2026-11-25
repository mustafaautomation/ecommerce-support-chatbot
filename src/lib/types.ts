export type OrderStatus =
  | "processing"
  | "labeled"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type ReturnReason =
  | "changed_mind"
  | "too_small"
  | "too_large"
  | "not_as_expected"
  | "damaged"
  | "defective"
  | "wrong_item"
  | "missing";

export type ReturnStatus =
  | "label_issued"
  | "in_transit"
  | "received"
  | "refund_issued"
  | "refunded"
  | "cancelled";

export type TicketPriority = "normal" | "high" | "urgent";
export type TicketStatus = "open" | "pending" | "resolved";

export type OrderItem = {
  id: string;
  sku: string;
  name: string;
  size: string;
  qty: number;
  priceCents: number;
  finalSale: boolean;
  returnedRma?: string;
};

export type Order = {
  number: string;
  email: string;
  customerName: string;
  status: OrderStatus;
  placedAt: string;
  deliveredAt: string | null;
  promisedAt: string | null;
  shippingMethod: string;
  city: string;
  region: string;
  country: string;
  postal: string;
  paymentMethod: string;
  trackingNumber: string | null;
  carrier: string | null;
  totalCents: number;
  items: OrderItem[];
};

export type ShipmentEvent = {
  at: string;
  code: string;
  label: string;
  location: string;
  detail: string;
};

export type Product = {
  sku: string;
  name: string;
  priceCents: number;
  category: string;
  sizes: string[];
  colors: string[];
  material: string;
  finalSale: boolean;
  blurb: string;
  tags: string[];
};

export type Citation = {
  slug: string;
  title: string;
  section: string;
};

export type Card =
  | { type: "order"; order: Order }
  | {
      type: "tracking";
      orderNumber: string;
      carrier: string;
      trackingNumber: string;
      status: OrderStatus;
      events: ShipmentEvent[];
    }
  | {
      type: "return_label";
      rma: string;
      orderNumber: string;
      kind: "return" | "exchange";
      items: OrderItem[];
      reason: ReturnReason;
      labelFeeCents: number;
      refundEstimateCents: number;
      replacementSize?: string;
      labelPath: string;
      status: ReturnStatus;
    }
  | { type: "products"; products: Product[] }
  | {
      type: "coupon";
      code: string;
      percent: number;
      capCents: number;
      orderNumber: string;
      reason: string;
    }
  | {
      type: "ticket";
      id: string;
      priority: TicketPriority;
      reason: string;
      summary: string;
      status: TicketStatus;
    }
  | {
      type: "size";
      productName: string;
      size: string;
      note: string;
    };

export type ToolTrace = {
  name: string;
  ok: boolean;
  summary: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards: Card[];
  citations: Citation[];
  tools: ToolTrace[];
  createdAt: string;
};

export type TurnResult = {
  conversationId: string;
  messageId: string;
  text: string;
  cards: Card[];
  citations: Citation[];
  tools: ToolTrace[];
  suggestions: string[];
  handoff: boolean;
};
