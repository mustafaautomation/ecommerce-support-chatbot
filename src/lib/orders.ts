import type { Store } from "@/lib/db";
import type { Order, OrderItem, OrderStatus, ShipmentEvent } from "@/lib/types";

type OrderRow = {
  number: string;
  email: string;
  customer_name: string;
  status: OrderStatus;
  placed_at: string;
  delivered_at: string | null;
  promised_at: string | null;
  shipping_method: string;
  city: string;
  region: string;
  country: string;
  postal: string;
  payment_method: string;
  tracking_number: string | null;
  carrier: string | null;
  total_cents: number;
  items_json: string;
};

function fromRow(row: OrderRow): Order {
  return {
    number: row.number,
    email: row.email,
    customerName: row.customer_name,
    status: row.status,
    placedAt: row.placed_at,
    deliveredAt: row.delivered_at,
    promisedAt: row.promised_at,
    shippingMethod: row.shipping_method,
    city: row.city,
    region: row.region,
    country: row.country,
    postal: row.postal,
    paymentMethod: row.payment_method,
    trackingNumber: row.tracking_number,
    carrier: row.carrier,
    totalCents: row.total_cents,
    items: JSON.parse(row.items_json) as OrderItem[],
  };
}

export function getOrder(store: Store, orderNumber: string): Order | undefined {
  const row = store.get<OrderRow>("SELECT * FROM orders WHERE number = ?", [
    orderNumber.toUpperCase(),
  ]);
  return row ? fromRow(row) : undefined;
}

export function findVerifiedOrder(
  store: Store,
  orderNumber: string,
  email: string,
): Order | undefined {
  const order = getOrder(store, orderNumber);
  if (!order) return undefined;
  if (order.email.toLowerCase() !== email.trim().toLowerCase()) return undefined;
  return order;
}

export function saveOrder(store: Store, order: Order) {
  store.run(
    `UPDATE orders SET status = ?, items_json = ?, tracking_number = ?, carrier = ? WHERE number = ?`,
    [
      order.status,
      JSON.stringify(order.items),
      order.trackingNumber,
      order.carrier,
      order.number,
    ],
  );
}

export function shipmentEvents(store: Store, orderNumber: string): ShipmentEvent[] {
  const rows = store.all<{
    at: string;
    code: string;
    label: string;
    location: string;
    detail: string;
  }>(
    "SELECT at, code, label, location, detail FROM shipment_events WHERE order_number = ? ORDER BY at ASC, id ASC",
    [orderNumber],
  );
  return rows;
}

export function listOrders(store: Store): Order[] {
  return store
    .all<OrderRow>("SELECT * FROM orders ORDER BY placed_at DESC")
    .map(fromRow);
}
