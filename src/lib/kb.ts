export type Article = {
  slug: string;
  title: string;
  sections: { heading: string; body: string }[];
};

export const ARTICLES: Article[] = [
  {
    slug: "shipping",
    title: "Shipping options and times",
    sections: [
      {
        heading: "Drift Ground",
        body: "Drift Ground takes 4–7 business days in the contiguous United States. It is free on orders of $75 or more, and $6.50 below that. Orders placed before 1pm PT on a business day ship the same day from the Grayhaven, Oregon warehouse. PO boxes can use Drift Ground only.",
      },
      {
        heading: "Harbor Air and Gale Express",
        body: "Harbor Air is 2–3 business days and costs $14. Gale Express overnight is $28 when the order is placed before 1pm PT, and it arrives the next business day. Overnight does not ship to PO boxes, Alaska, or Hawaii.",
      },
      {
        heading: "Alaska and Hawaii",
        body: "Alaska and Hawaii ship by Drift Ground in 7–12 business days. Overnight is not available. The free-shipping threshold is still $75.",
      },
      {
        heading: "Cancellation",
        body: "An order can be cancelled only while it is still processing and no shipping label has been created. Once a label exists, the carrier has the parcel and cancellation is no longer possible. After delivery, start a return instead of a cancellation.",
      },
    ],
  },
  {
    slug: "international",
    title: "International shipping",
    sections: [
      {
        heading: "Canada",
        body: "We ship to Canada in 6–10 business days for a flat $18. Duties and taxes are unpaid (delivered duty unpaid), so the carrier collects them on delivery. We do not ship to Canadian PO boxes.",
      },
      {
        heading: "United Kingdom and Europe",
        body: "We do not currently ship to the United Kingdom, the European Union, or anywhere outside the United States and Canada. A checkout address in those countries cannot be completed.",
      },
    ],
  },
  {
    slug: "returns",
    title: "Returns and exchanges",
    sections: [
      {
        heading: "30-day window",
        body: "You have 30 days from the delivery date to start a return or an exchange. The item should be unworn and unwashed, with tags on. We refund the price you paid, not a later sale price.",
      },
      {
        heading: "Final sale",
        body: "Final sale items cannot come back for fit or a change of mind. That includes socks, swim, underwear, gift cards, and anything marked Final Sale on the product page. If a final-sale item arrives damaged or defective, we still take it back.",
      },
      {
        heading: "Label fee",
        body: "Change-of-mind returns, including fit without a defect, use a prepaid Northline Freight label. We deduct $7.95 from the refund for that label. Damaged, defective, and wrong-item returns ship back on us, with no deduction.",
      },
      {
        heading: "Exchanges",
        body: "Size and color exchanges are free when the new size is in stock. We email the same prepaid return label. The replacement ships when the carrier scans the return, not before.",
      },
      {
        heading: "Damaged items",
        body: "Tell us about damage or a defect as soon as you can, ideally within 14 days of delivery. We still accept a damaged item inside the 30-day window and send a free label. High-value damage, and any parcel that is missing, goes to a person on the desk rather than an automatic label.",
      },
    ],
  },
  {
    slug: "refunds",
    title: "Refund timing",
    sections: [
      {
        heading: "When we send the money",
        body: "We issue the refund to the original payment method within 2 business days of the warehouse receiving the return. We do not refund to a different card.",
      },
      {
        heading: "Bank and wallet timing",
        body: "After we issue the refund, cards take 5–7 business days to show it. PayPal takes 1–2 days. Drift Pay takes about 3 business days. Gift card refunds return to the gift card balance the same day we issue them.",
      },
    ],
  },
  {
    slug: "sizing",
    title: "Sizing guides",
    sections: [
      {
        heading: "Shells, fleece, and parkas",
        body: "Cedar Rain Shell, Harbor Fleece, and the Northline Parka use the same chart. XS fits chest 32–34 in and height 5'2\"–5'5\". S fits chest 35–37 in and height 5'4\"–5'8\". M fits chest 38–40 in and height 5'8\"–5'11\". L fits chest 41–44 in and height 5'11\"–6'2\". XL fits chest 45–48 in and height 6'1\"–6'4\". If you are between sizes, or you plan to layer a fleece under a shell, size up.",
      },
      {
        heading: "Pants and shoes",
        body: "Drift Pants are sized by waist: 28, 30, 32, 34, 36, and 38, with a regular inseam. Ridge Approach Shoes follow your usual US street size. If you wear a thick hiking sock, consider a half size up; we only stock whole sizes.",
      },
      {
        heading: "Beanies",
        body: "The Trail Wool Beanie is one size for a 21–24 inch head circumference.",
      },
    ],
  },
  {
    slug: "care",
    title: "Product care",
    sections: [
      {
        heading: "Rain shells",
        body: "Wipe mud off a rain shell with a damp cloth. Wash rarely, on cold, with a technical wash. Do not use fabric softener. Drip dry, then tumble on low for 20 minutes to refresh the DWR. Ironing and dry cleaning are not recommended.",
      },
      {
        heading: "Merino and fleece",
        body: "Wash merino cold and lay it flat. Wash fleece cold and skip fabric softener, which clogs the pile. Do not tumble merino.",
      },
      {
        heading: "Down",
        body: "Wash the Fogline Down Vest with a down-specific wash. Dry on low with two clean dryer balls until the loft returns. Store it uncompressed.",
      },
    ],
  },
  {
    slug: "warranty",
    title: "Warranty",
    sections: [
      {
        heading: "What is covered",
        body: "Driftwood-branded shells and pants have a lifetime warranty on seams and zippers against manufacturing defects. The Northline Parka and Stormwatch Bib are included. The warranty is for the original owner and needs the order number.",
      },
      {
        heading: "What is not covered",
        body: "The warranty does not cover abrasion, burns, pet damage, lost items, or ordinary wear. It is a repair or a replacement of the defective part. It is not a way to return something because the color or the fit is wrong.",
      },
    ],
  },
  {
    slug: "promos",
    title: "Promo terms and courtesy coupons",
    sections: [
      {
        heading: "WELCOME10",
        body: "WELCOME10 takes 10% off a first order of $50 or more. It does not apply to final sale items, it does not stack with other codes, and it is one use per customer. Free shipping still starts at $75 before discounts. Codes announced by email are the only public promos. Chat does not invent extra codes.",
      },
      {
        heading: "Courtesy coupons",
        body: "If we miss a delivery promise by more than 2 days, Rowan may issue one courtesy code for that order: 10% off a future order, capped at $25. The order total must be $400 or under. We do not issue courtesy codes for buyer's remorse, final-sale regret, or a request above that cap. Larger make-goods go to a person and are written in the coupon log when they happen.",
      },
    ],
  },
  {
    slug: "payments",
    title: "Payment methods",
    sections: [
      {
        heading: "What we accept",
        body: "We accept Visa, Mastercard, American Express, PayPal, Drift Pay, and Driftwood gift cards. The billing address needs to match the card. We do not take checks or cash on delivery.",
      },
      {
        heading: "Gift cards and chat safety",
        body: "Gift cards do not expire, cannot be redeemed for cash, and cannot be returned. Never send a full card number, a security code, or a password in this chat. Rowan cannot see or change a saved card.",
      },
    ],
  },
  {
    slug: "account",
    title: "Account help",
    sections: [
      {
        heading: "Lookup without an account",
        body: "An account is optional. Guest checkout is fine. To look up an order, Rowan needs the order number (DW- plus digits) and the email used at checkout. A matching pair is required before any order, tracking, return, or cancellation is shown.",
      },
      {
        heading: "Password and address",
        body: "Password reset links last 30 minutes and are sent from the account page, not from this chat. Do not type your password here. A shipping address can be changed only before the shipping label is created. After that, wait for delivery and start a return if you need the parcel sent somewhere else.",
      },
    ],
  },
];

export function articleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}

export function articleText(slug: string): string {
  const article = articleBySlug(slug);
  if (!article) return "";
  return article.sections.map((section) => section.body).join(" ");
}
