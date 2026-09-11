import LegalLayout, { LegalSection } from "@/components/legal/LegalLayout";

const sections: LegalSection[] = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "eligibility", title: "Eligibility & Accounts" },
  { id: "products-orders", title: "Products, Orders & Pricing" },
  { id: "payments", title: "Payment Terms" },
  { id: "delivery", title: "Delivery" },
  { id: "returns", title: "Returns, Refunds & Cancellations" },
  { id: "product-use", title: "Product Use & Safety" },
  { id: "custom-orders", title: "Custom & Bulk Orders" },
  { id: "distributors", title: "Distributor & Partner Applications" },
  { id: "coupons-loyalty", title: "Coupons, Loyalty Points & Referrals" },
  { id: "user-content", title: "Reviews & User Content" },
  { id: "prohibited-conduct", title: "Prohibited Conduct" },
  { id: "intellectual-property", title: "Intellectual Property" },
  { id: "disclaimers", title: "Disclaimers" },
  { id: "liability", title: "Limitation of Liability" },
  { id: "indemnification", title: "Indemnification" },
  { id: "termination", title: "Suspension & Termination" },
  { id: "governing-law", title: "Governing Law & Disputes" },
  { id: "changes", title: "Changes to These Terms" },
  { id: "contact", title: "Contact Us" },
];

const TermsOfService = () => (
  <LegalLayout
    title="Terms of Service"
    description="The terms and conditions governing your use of Becof Organic Chemicals' website and services."
    lastUpdated="11 September 2026"
    sections={sections}
  >
    <section id="acceptance">
      <h2>1. Acceptance of Terms</h2>
      <p>
        These Terms of Service ("Terms") govern your access to and use of becoforganicchemicals.com and all
        related services (collectively, the "Services") operated by Becof Organic Chemicals Limited ("Becof",
        "we", "us", "our"). By creating an account, placing an order, submitting an application, or otherwise
        using the Services, you agree to be bound by these Terms. If you do not agree, please do not use the
        Services.
      </p>
      <p>
        These Terms should be read together with our <a href="/legal/privacy">Privacy Policy</a>, our{" "}
        <a href="/legal/cookies">Cookie Policy</a>, and our <a href="/legal/accessibility">Accessibility
        Statement</a>, each incorporated here by reference.
      </p>
    </section>

    <section id="eligibility">
      <h2>2. Eligibility &amp; Accounts</h2>
      <p>
        To create an account or place an order, you must be at least 18 years old, or otherwise have the legal
        capacity to enter into a binding contract under the laws of Kenya. You are responsible for maintaining
        the confidentiality of your account credentials and for all activity that occurs under your account. You
        agree to provide accurate, current, and complete information when registering, and to keep it updated.
      </p>
      <p>
        We offer distinct account types — customer, distributor, and farmer accounts — each with different
        features. We reserve the right to verify eligibility for distributor status and to decline or revoke
        distributor access at our discretion, including where information provided is found to be inaccurate.
      </p>
    </section>

    <section id="products-orders">
      <h2>3. Products, Orders &amp; Pricing</h2>
      <p>
        All product descriptions, images, and specifications are provided in good faith and are as accurate as
        we can reasonably make them, but we do not warrant that they are error-free. Prices are listed in Kenyan
        Shillings (KES) and are subject to change without notice; the price applicable to your order is the
        price displayed at the time you complete checkout.
      </p>
      <p>
        Placing an order constitutes an offer to purchase, which we may accept or decline. We reserve the right
        to refuse or cancel any order for reasons including, but not limited to: product unavailability, errors
        in pricing or product information, suspected fraudulent activity, or an issue with your delivery
        location. If we cancel an order after payment has been received, we will refund the amount paid.
      </p>
      <p>
        Stock levels shown on the website are indicative and may change between the time you view a product and
        the time you complete an order.
      </p>
    </section>

    <section id="payments">
      <h2>4. Payment Terms</h2>
      <p>
        We accept payment via M-Pesa. When you initiate payment, you will receive an STK push prompt on your
        registered phone number; entering your M-Pesa PIN authorises the payment directly with Safaricom. We do
        not receive, see, or store your M-Pesa PIN at any point.
      </p>
      <p>
        Your order is confirmed only once payment is successfully received and reflected as such in our system.
        If a payment attempt fails, is cancelled, or times out, your order will remain unpaid until you complete
        payment successfully — you may retry payment on the same order rather than needing to place a new one.
      </p>
    </section>

    <section id="delivery">
      <h2>5. Delivery</h2>
      <p>
        <strong>Delivery is not included in the listed product price.</strong> Our sales team will contact you
        after your order is placed to confirm the applicable delivery fee based on your location, before your
        order is dispatched. Estimated delivery timeframes provided by our team are estimates only and not
        guaranteed delivery dates; we are not liable for delays caused by circumstances outside our reasonable
        control, including but not limited to courier delays, weather, or events beyond our control.
      </p>
      <p>
        Please ensure the shipping address and contact phone number you provide are accurate and reachable — we
        are not responsible for failed or delayed delivery caused by incorrect or incomplete information you
        provided.
      </p>
    </section>

    <section id="returns">
      <h2>6. Returns, Refunds &amp; Cancellations</h2>
      <p>
        Given the nature of agricultural chemical products, we generally cannot accept returns of products that
        have been opened, used, or whose safety seal has been broken, for health, safety, and regulatory reasons.
        If you receive a product that is damaged, defective, or materially different from what you ordered,
        contact us within a reasonable time of delivery with your order reference and, where possible, photos of
        the issue, and we will work with you in good faith toward a replacement or refund.
      </p>
      <p>
        Refunds, where approved, are issued to the M-Pesa number used for the original payment, or by another
        method we agree with you, and may take a reasonable number of business days to process.
      </p>
      <p>
        You may cancel an order before it has been dispatched by contacting us directly; once an order has been
        dispatched, cancellation is no longer possible and the return process described above applies instead.
      </p>
    </section>

    <section id="product-use">
      <h2>7. Product Use &amp; Safety</h2>
      <p>
        Our products are intended for agricultural use only, applied strictly in accordance with the dosage,
        dilution, and usage instructions provided on the product label and product page. You are responsible
        for reading and following all label instructions, dosage rates, and any applicable safety
        precautions before use. Where a Safety Data Sheet is provided for a product, you should review it before
        handling or applying that product.
      </p>
      <p>
        We are not liable for outcomes arising from use of a product in a manner inconsistent with its labelled
        instructions, for use on crops or in conditions outside its intended application, or for effects arising
        from factors outside our control such as soil condition, weather, or interaction with other products or
        chemicals applied by you or a third party.
      </p>
      <p>
        If you have questions about the suitability of a product for your specific crop, soil, or farming
        conditions, contact us or consult a qualified agronomist before use.
      </p>
    </section>

    <section id="custom-orders">
      <h2>8. Custom &amp; Bulk Orders</h2>
      <p>
        Custom or bulk order requests submitted through the Services are quotation requests, not binding orders.
        Our sales team will review your request and contact you to confirm product availability, pricing,
        delivery fees, and any required deposit. A custom order becomes binding only once you have agreed to the
        confirmed terms and paid the required deposit. Deposits are non-refundable except where we are unable to
        fulfil the order as agreed.
      </p>
    </section>

    <section id="distributors">
      <h2>9. Distributor &amp; Partner Applications</h2>
      <p>
        Applications to become a distributor or partner are reviewed at our discretion. Submitting an
        application does not guarantee approval. Approved distributors receive access to a distributor portal
        with additional features and are expected to represent Becof and its products accurately and in good
        faith in their own dealings with customers. We reserve the right to suspend or revoke distributor status
        for conduct that misrepresents our products, breaches these Terms, or otherwise harms Becof's reputation
        or interests.
      </p>
    </section>

    <section id="coupons-loyalty">
      <h2>10. Coupons, Loyalty Points &amp; Referrals</h2>
      <p>
        Coupon codes are subject to the specific terms attached to each code (such as minimum order value,
        expiry date, and usage limits) and may be withdrawn or modified at any time before use. Only one coupon
        may be applied per order unless stated otherwise.
      </p>
      <p>
        Our loyalty points program allows customers to earn points on delivered, paid orders, which may be
        redeemed for a discount on a future order, subject to the redemption cap and rules displayed in your
        account at the time of redemption. Loyalty points have no cash value, cannot be transferred, sold, or
        exchanged for cash, and expire after the period stated in your account. We reserve the right to adjust,
        suspend, or terminate the loyalty points program, or to reverse points awarded in error or obtained
        through fraudulent or abusive activity (including but not limited to fraudulent reviews or fake
        referrals), at our discretion.
      </p>
      <p>
        Our referral program rewards an existing customer when a customer they referred completes their first
        paid, delivered order. Referral rewards are subject to the same restrictions as loyalty points above,
        and we reserve the right to withhold or reverse referral rewards obtained through abuse of the program
        (such as self-referral through multiple accounts).
      </p>
    </section>

    <section id="user-content">
      <h2>11. Reviews &amp; User Content</h2>
      <p>
        When you submit a product review, testimonial, or other content (including photos) through the
        Services, you grant Becof a non-exclusive, royalty-free, worldwide licence to use, reproduce, display,
        and publish that content on our website and in our marketing materials, in connection with the product
        or service it relates to. You confirm that any content you submit is your own, does not infringe any
        third party's rights, and is not false, misleading, defamatory, or unlawful.
      </p>
      <p>
        We reserve the right to remove or decline to publish any user content, including reviews, at our
        discretion, including where it appears fraudulent, abusive, or otherwise inconsistent with these Terms.
      </p>
    </section>

    <section id="prohibited-conduct">
      <h2>12. Prohibited Conduct</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Services for any unlawful purpose or in violation of any applicable law or regulation</li>
        <li>Provide false, inaccurate, or misleading information when creating an account, placing an order, submitting a review, or applying as a distributor</li>
        <li>Attempt to gain unauthorised access to any part of the Services, other users' accounts, or our systems</li>
        <li>Interfere with or disrupt the integrity or performance of the Services</li>
        <li>Abuse or attempt to manipulate the coupon, loyalty points, or referral systems, including through fake accounts or fraudulent reviews</li>
        <li>Reproduce, resell, or exploit any part of the Services without our prior written consent</li>
      </ul>
    </section>

    <section id="intellectual-property">
      <h2>13. Intellectual Property</h2>
      <p>
        All content on the Services — including our name, logo, product names, trademarks, text, graphics,
        product photography, and software — is the property of Becof Organic Chemicals Limited or its licensors
        and is protected by applicable intellectual property laws. Nothing in these Terms grants you any right
        to use our trademarks, branding, or content except as expressly permitted (for example, content you
        submit yourself, as described in <a href="#user-content">Section 11</a>).
      </p>
    </section>

    <section id="disclaimers">
      <h2>14. Disclaimers</h2>
      <p>
        The Services are provided on an "as is" and "as available" basis. To the fullest extent permitted by
        Kenyan law, we disclaim all warranties, express or implied, including implied warranties of
        merchantability, fitness for a particular purpose, and non-infringement, except where such warranties
        cannot lawfully be excluded under the Consumer Protection Act, 2012 or other applicable consumer
        protection legislation.
      </p>
    </section>

    <section id="liability">
      <h2>15. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, Becof shall not be liable for any indirect, incidental, special,
        consequential, or punitive damages, or any loss of profits, revenue, crops, or data, arising out of or
        in connection with your use of the Services or any product purchased through them. Our total aggregate
        liability arising from any order shall not exceed the amount you paid for that order. Nothing in these
        Terms limits liability that cannot lawfully be limited or excluded under Kenyan law, including liability
        for death or personal injury caused by proven negligence or for fraud.
      </p>
    </section>

    <section id="indemnification">
      <h2>16. Indemnification</h2>
      <p>
        You agree to indemnify and hold Becof, its directors, employees, and agents harmless from any claim,
        loss, liability, or expense (including reasonable legal fees) arising out of your misuse of the
        Services, your breach of these Terms, or your violation of any law or the rights of a third party.
      </p>
    </section>

    <section id="termination">
      <h2>17. Suspension &amp; Termination</h2>
      <p>
        We may suspend or terminate your account, at our discretion, where we reasonably believe you have
        breached these Terms, engaged in fraudulent or abusive conduct, or where required to comply with
        applicable law. You may close your account at any time by contacting us. Provisions of these Terms that
        by their nature should survive termination (including intellectual property, disclaimers, limitation of
        liability, and indemnification) will continue to apply after your account is closed.
      </p>
    </section>

    <section id="governing-law">
      <h2>18. Governing Law &amp; Disputes</h2>
      <p>
        These Terms are governed by the laws of the Republic of Kenya, without regard to conflict-of-law
        principles. Any dispute arising out of or relating to these Terms or the Services shall first be
        addressed through good-faith negotiation between the parties; if unresolved, the dispute shall be
        subject to the exclusive jurisdiction of the courts of Kenya, without prejudice to any right you have to
        bring a claim before a relevant consumer protection body.
      </p>
    </section>

    <section id="changes">
      <h2>19. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. The "Last updated" date at the top of this page reflects
        the most recent revision. Continued use of the Services after changes take effect constitutes acceptance
        of the revised Terms. Where changes are material, we will make reasonable efforts to notify you.
      </p>
    </section>

    <section id="contact">
      <h2>20. Contact Us</h2>
      <p>Questions about these Terms can be directed to:</p>
      <ul>
        <li>Email: <a href="mailto:info@becoforganic.com">info@becoforganic.com</a></li>
        <li>Phone: <a href="tel:+254735283397">+254 735 283 397</a></li>
        <li>Address: Ongata Rongai, Kajiado County, Kenya</li>
      </ul>
    </section>
  </LegalLayout>
);

export default TermsOfService;
