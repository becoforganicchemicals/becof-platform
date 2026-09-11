import LegalLayout, { LegalSection } from "@/components/legal/LegalLayout";

const sections: LegalSection[] = [
  { id: "introduction", title: "Introduction" },
  { id: "who-we-are", title: "Who We Are" },
  { id: "information-we-collect", title: "Information We Collect" },
  { id: "how-we-use-information", title: "How We Use Your Information" },
  { id: "legal-basis", title: "Legal Basis for Processing" },
  { id: "third-parties", title: "Third Parties We Share Data With" },
  { id: "payments", title: "M-Pesa & Payment Data" },
  { id: "cookies", title: "Cookies & Local Storage" },
  { id: "data-retention", title: "Data Retention" },
  { id: "data-security", title: "Data Security" },
  { id: "international-transfers", title: "International Data Transfers" },
  { id: "your-rights", title: "Your Rights Under Kenyan Law" },
  { id: "childrens-privacy", title: "Children's Privacy" },
  { id: "marketing", title: "Marketing Communications" },
  { id: "changes", title: "Changes to This Policy" },
  { id: "contact", title: "Contact Us & Complaints" },
];

const PrivacyPolicy = () => (
  <LegalLayout
    title="Privacy Policy"
    description="How Becof Organic Chemicals Limited collects, uses, and protects your personal data."
    lastUpdated="11 September 2026"
    sections={sections}
  >
    <section id="introduction">
      <h2>1. Introduction</h2>
      <p>
        Becof Organic Chemicals Limited ("Becof", "we", "us", or "our") is committed to protecting the privacy
        and personal data of everyone who visits becoforganicchemicals.com, creates an account, places an
        order, applies to become a distributor, or otherwise interacts with our platform (collectively, the
        "Services"). This Privacy Policy explains what personal data we collect, why we collect it, how we use
        and share it, and the rights you have over it.
      </p>
      <p>
        This Policy is written to comply with the <strong>Data Protection Act, 2019</strong> of Kenya and its
        subsidiary regulations, including the Data Protection (General) Regulations, 2021. If you access our
        Services from outside Kenya, other data protection laws that apply to you (such as the EU/UK GDPR) may
        also give you additional rights; nothing in this Policy limits rights you have under a law that applies
        to you.
      </p>
    </section>

    <section id="who-we-are">
      <h2>2. Who We Are</h2>
      <p>
        Becof Organic Chemicals Limited is a private limited company incorporated in Kenya, with its production
        facility in Ongata Rongai, Kajiado County. We are the "data controller" for the personal data described
        in this Policy — the entity that decides why and how your personal data is processed.
      </p>
      <ul>
        <li><strong>Company:</strong> Becof Organic Chemicals Limited</li>
        <li><strong>Location:</strong> Ongata Rongai, Kajiado County, Kenya</li>
        <li><strong>Email:</strong> <a href="mailto:info@becoforganic.com">info@becoforganic.com</a></li>
        <li><strong>Phone:</strong> <a href="tel:+254735283397">+254 735 283 397</a></li>
        <li><strong>Data Protection Commissioner registration:</strong> [To be completed — registration with Kenya's Office of the Data Protection Commissioner (ODPC), where applicable, should be confirmed with legal counsel before this Policy is treated as final.]</li>
      </ul>
    </section>

    <section id="information-we-collect">
      <h2>3. Information We Collect</h2>
      <p>We collect the following categories of personal data, depending on how you use our Services:</p>
      <h3>3.1 Account &amp; Profile Information</h3>
      <ul>
        <li>Full name, email address, phone number</li>
        <li>Profile photo/avatar, if you choose to upload one</li>
        <li>Password (stored only as a secure, one-way hash — we never see or store your plaintext password)</li>
        <li>For farmers: farm location, farm size, crop types, bio</li>
        <li>For distributors/partner applicants: business name, business location, coverage area, years in business, KRA PIN and business registration documents (where submitted as part of a distributor application), and any supporting documents you upload</li>
      </ul>
      <h3>3.2 Order &amp; Transaction Information</h3>
      <ul>
        <li>Shipping/delivery address and contact phone number for each order</li>
        <li>Products ordered, quantities, prices, order status, and delivery notes</li>
        <li>M-Pesa phone number, M-Pesa checkout/transaction references, and M-Pesa receipt numbers (see <a href="#payments">Section 7</a> for detail on payment data)</li>
        <li>Coupon codes applied and loyalty points earned, redeemed, or adjusted</li>
        <li>Custom/bulk order requests and any specifications you provide</li>
      </ul>
      <h3>3.3 Content You Submit</h3>
      <ul>
        <li>Product reviews, star ratings, and any photos you attach to a review</li>
        <li>Testimonials you submit for publication</li>
        <li>Messages sent through our contact form, and any attachments (e.g. CVs submitted through a careers application)</li>
      </ul>
      <h3>3.4 Technical &amp; Usage Information</h3>
      <ul>
        <li>IP address, browser type, and device information, collected automatically by our hosting infrastructure for security and abuse-prevention purposes</li>
        <li>Information stored in your browser via cookies and local storage — see <a href="#cookies">Section 8</a></li>
      </ul>
      <p>
        We do not knowingly collect sensitive categories of personal data (such as health, biometric, or genetic
        data) through the Services, and we ask that you do not include such information in free-text fields
        (e.g. contact messages or review comments) unless it is strictly necessary and directly relevant.
      </p>
    </section>

    <section id="how-we-use-information">
      <h2>4. How We Use Your Information</h2>
      <p>We use your personal data to:</p>
      <ul>
        <li>Create and manage your account, and authenticate you when you sign in</li>
        <li>Process, fulfil, and deliver your orders, including contacting you about delivery fees and logistics</li>
        <li>Process payments via M-Pesa and reconcile transactions</li>
        <li>Operate our loyalty points and referral program, including calculating points earned, applying redemptions, and crediting referral bonuses</li>
        <li>Respond to enquiries submitted through our contact form, and process distributor, partner, or career applications</li>
        <li>Display product reviews and testimonials you choose to submit publicly</li>
        <li>Send transactional emails (order confirmations, payment receipts, delivery updates, password resets)</li>
        <li>Maintain the security, integrity, and proper functioning of our platform, including preventing fraud and abuse</li>
        <li>Comply with our legal obligations, including tax, consumer protection, and company law requirements</li>
      </ul>
    </section>

    <section id="legal-basis">
      <h2>5. Legal Basis for Processing</h2>
      <p>Under the Data Protection Act, 2019, we rely on the following legal bases to process your personal data:</p>
      <ul>
        <li><strong>Performance of a contract</strong> — to create your account, process your orders, and deliver the Services you request</li>
        <li><strong>Consent</strong> — for optional features such as uploading a profile photo, submitting a review with a photo, or receiving marketing communications you have opted into</li>
        <li><strong>Legal obligation</strong> — to comply with tax, consumer protection, and other applicable Kenyan laws</li>
        <li><strong>Legitimate interests</strong> — to secure our platform, prevent fraud, and improve our Services, balanced against your rights and freedoms</li>
      </ul>
      <p>Where we rely on your consent, you may withdraw it at any time by contacting us — see <a href="#contact">Section 16</a>.</p>
    </section>

    <section id="third-parties">
      <h2>6. Third Parties We Share Data With</h2>
      <p>
        We do not sell your personal data. We share personal data only with service providers who process it on
        our behalf to operate the Services, under contractual obligations to protect it:
      </p>
      <ul>
        <li><strong>Safaricom PLC (M-Pesa / Daraja API)</strong> — to initiate and confirm mobile money payments</li>
        <li><strong>Cloud infrastructure and database providers</strong> (our platform is built on Supabase/Lovable Cloud infrastructure) — to host our database, authentication system, and file storage</li>
        <li><strong>Resend</strong> — to deliver transactional emails (order confirmations, receipts, notifications)</li>
        <li><strong>Google Analytics</strong> — only if you've consented to analytics cookies, to help us understand site traffic and usage patterns</li>
        <li><strong>Professional advisers</strong> (accountants, auditors, lawyers) — where necessary for our legitimate business operations</li>
        <li><strong>Regulators and law enforcement</strong> — where required by law, court order, or to protect our legal rights</li>
      </ul>
      <p>
        We may also disclose information if Becof undergoes a merger, acquisition, or sale of assets, in which
        case personal data may be transferred as part of that transaction, subject to the same protections
        described in this Policy.
      </p>
    </section>

    <section id="payments">
      <h2>7. M-Pesa &amp; Payment Data</h2>
      <p>
        When you pay via M-Pesa, we collect your phone number, an M-Pesa checkout request reference, and — once
        payment succeeds — the M-Pesa receipt number and confirmed amount. <strong>We never see, collect, or
        store your M-Pesa PIN.</strong> PIN entry happens entirely within Safaricom's own STK push prompt on your
        phone, outside of our platform. Payment authorisation and fund transfer are handled directly by
        Safaricom's Daraja payment infrastructure under Safaricom's own terms and privacy practices.
      </p>
    </section>

    <section id="cookies">
      <h2>8. Cookies &amp; Local Storage</h2>
      <p>
        We use browser local storage for essential functionality — keeping you signed in, capturing a referral
        code, and remembering dismissed prompts — which runs regardless of consent, since the site can't work
        without it. With your explicit consent, given via the cookie banner on your first visit, we also use
        Google Analytics to understand site traffic; it is never loaded unless you agree to it, and you can
        change that choice at any time. See our <a href="/legal/cookies">Cookie Policy</a> for full detail,
        including how to review or withdraw your consent.
      </p>
    </section>

    <section id="data-retention">
      <h2>9. Data Retention</h2>
      <p>We retain personal data only for as long as necessary for the purposes described in this Policy:</p>
      <ul>
        <li>Account data — for as long as your account remains active, plus a reasonable period afterward in case you wish to reactivate it</li>
        <li>Order and transaction records — for the period required by applicable Kenyan tax, company, and consumer protection legislation</li>
        <li>Reviews and testimonials — until you request removal or close your account</li>
        <li>Contact form messages and job applications — for as long as reasonably necessary to respond to and process your enquiry or application</li>
      </ul>
      <p>
        Where you request deletion of your account (see <a href="#your-rights">Section 12</a>), we will delete or
        anonymise personal data that we are not otherwise required to retain by law.
      </p>
    </section>

    <section id="data-security">
      <h2>10. Data Security</h2>
      <p>We apply technical and organisational measures appropriate to the sensitivity of the data we hold, including:</p>
      <ul>
        <li>Encryption of data in transit (HTTPS/TLS) across the entire platform</li>
        <li>Row-level access controls on our database, so customer data is only accessible to the account it belongs to, or to authorised staff performing their duties</li>
        <li>Role-based access controls for staff, with individually granted permissions rather than blanket administrator access</li>
        <li>An internal audit log of administrative actions taken on customer and order records</li>
        <li>Passwords stored only as salted, one-way cryptographic hashes</li>
      </ul>
      <p>
        No system is completely secure, and we cannot guarantee absolute security of information transmitted to
        us. If you believe your account has been compromised, contact us immediately using the details in{" "}
        <a href="#contact">Section 16</a>.
      </p>
    </section>

    <section id="international-transfers">
      <h2>11. International Data Transfers</h2>
      <p>
        Our cloud infrastructure and email delivery providers may process and store data on servers located
        outside Kenya. Where personal data is transferred outside Kenya, we take steps intended to ensure it
        receives a comparable level of protection, in line with the requirements of the Data Protection Act,
        2019 governing cross-border data transfers. If you would like more detail on the specific safeguards in
        place, contact us using the details in <a href="#contact">Section 16</a>.
      </p>
    </section>

    <section id="your-rights">
      <h2>12. Your Rights Under Kenyan Law</h2>
      <p>Under the Data Protection Act, 2019, you have the right to:</p>
      <ul>
        <li><strong>Access</strong> the personal data we hold about you</li>
        <li><strong>Rectify</strong> personal data that is inaccurate or incomplete</li>
        <li><strong>Erasure</strong> of personal data we no longer have a lawful basis to hold</li>
        <li><strong>Object</strong> to processing carried out on the basis of legitimate interests</li>
        <li><strong>Restrict</strong> processing in certain circumstances</li>
        <li><strong>Data portability</strong> — receive certain data you provided to us in a structured, commonly used format</li>
        <li><strong>Withdraw consent</strong> at any time, where processing is based on consent</li>
        <li><strong>Lodge a complaint</strong> with the Office of the Data Protection Commissioner (ODPC) of Kenya if you believe we have not handled your data lawfully</li>
      </ul>
      <p>
        To exercise any of these rights, contact us using the details in <a href="#contact">Section 16</a>. We
        will respond within the timeframes required by law. We may need to verify your identity before acting on
        a request.
      </p>
    </section>

    <section id="childrens-privacy">
      <h2>13. Children's Privacy</h2>
      <p>
        Our Services are intended for use by individuals who are at least 18 years old, or who otherwise have
        the legal capacity to enter into a binding contract under Kenyan law. We do not knowingly collect
        personal data from children. If you believe a child has provided us with personal data, please contact
        us so we can take appropriate action.
      </p>
    </section>

    <section id="marketing">
      <h2>14. Marketing Communications</h2>
      <p>
        We may send you order-related and account-related emails (order confirmations, payment receipts,
        delivery updates, security notices) as a normal part of operating the Services — these are not
        optional, as they are necessary to fulfil your orders and secure your account. If we introduce
        promotional or marketing communications in the future, we will only send these with your consent, and
        every such communication will include a clear way to opt out.
      </p>
    </section>

    <section id="changes">
      <h2>15. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time to reflect changes in our practices or legal
        requirements. The "Last updated" date at the top of this page reflects the most recent revision. Material
        changes will be highlighted on our website. Your continued use of the Services after a revised Policy
        takes effect constitutes acceptance of the changes.
      </p>
    </section>

    <section id="contact">
      <h2>16. Contact Us &amp; Complaints</h2>
      <p>If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, contact us at:</p>
      <ul>
        <li>Email: <a href="mailto:info@becoforganic.com">info@becoforganic.com</a></li>
        <li>Phone: <a href="tel:+254735283397">+254 735 283 397</a></li>
        <li>Address: Ongata Rongai, Kajiado County, Kenya</li>
      </ul>
      <p>
        If you are not satisfied with our response, you have the right to lodge a complaint with the{" "}
        <strong>Office of the Data Protection Commissioner (ODPC), Kenya</strong>.
      </p>
    </section>
  </LegalLayout>
);

export default PrivacyPolicy;
