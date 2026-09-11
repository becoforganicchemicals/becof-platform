import LegalLayout, { LegalSection } from "@/components/legal/LegalLayout";

const sections: LegalSection[] = [
  { id: "commitment", title: "Our Commitment" },
  { id: "conformance", title: "Conformance Target" },
  { id: "measures", title: "Measures We've Taken" },
  { id: "known-limitations", title: "Known Limitations" },
  { id: "compatibility", title: "Compatibility with Assistive Technology" },
  { id: "feedback", title: "Feedback & Reporting Issues" },
  { id: "changes", title: "Changes to This Statement" },
];

const AccessibilityStatement = () => (
  <LegalLayout
    title="Accessibility Statement"
    description="Becof Organic Chemicals' commitment to making our website accessible to everyone."
    lastUpdated="11 September 2026"
    sections={sections}
  >
    <section id="commitment">
      <h2>1. Our Commitment</h2>
      <p>
        Becof Organic Chemicals Limited is committed to ensuring our website is accessible to everyone,
        including farmers, distributors, and customers who use assistive technology or who navigate the web
        differently. We believe that access to information about sustainable agricultural products should not
        depend on ability, device, or connection quality, and we treat accessibility as an ongoing effort rather
        than a one-time fix.
      </p>
    </section>

    <section id="conformance">
      <h2>2. Conformance Target</h2>
      <p>
        We are working toward conformance with the{" "}
        <strong>Web Content Accessibility Guidelines (WCAG) 2.1, Level AA</strong> — the internationally
        recognised standard for web accessibility. This is a target we are actively working toward across the
        site, not a certification that every page has been independently audited against.
      </p>
    </section>

    <section id="measures">
      <h2>3. Measures We've Taken</h2>
      <p>Steps already reflected in how the site is built include:</p>
      <ul>
        <li>Semantic HTML structure and heading hierarchy to support screen readers and keyboard navigation</li>
        <li>Text alternatives for meaningful images and icons</li>
        <li>Colour choices designed to maintain readable contrast in both light and dark viewing modes</li>
        <li>Keyboard-operable interactive elements (forms, buttons, menus)</li>
        <li>Responsive layouts that adapt to different screen sizes and zoom levels rather than breaking</li>
      </ul>
    </section>

    <section id="known-limitations">
      <h2>4. Known Limitations</h2>
      <p>
        Despite our efforts, some parts of the site may not yet be fully accessible. Known areas we are actively
        improving include ensuring consistent focus indicators across all interactive components, and reviewing
        complex admin-facing tools (used by our own staff, not the public) against the same standard. If you
        encounter a specific barrier, please tell us — see <a href="#feedback">Section 6</a> — so we can
        prioritise it.
      </p>
    </section>

    <section id="compatibility">
      <h2>5. Compatibility with Assistive Technology</h2>
      <p>
        Our website is built using modern, standards-based web technology intended to work with commonly used
        assistive technology, including screen readers, screen magnification software, and keyboard-only
        navigation, on current versions of major browsers. If you use assistive technology and find that a
        specific page does not behave as expected, we would like to know the browser and assistive technology
        you were using — see <a href="#feedback">Section 6</a> below.
      </p>
    </section>

    <section id="feedback">
      <h2>6. Feedback &amp; Reporting Issues</h2>
      <p>
        We welcome your feedback on the accessibility of becoforganicchemicals.com. If you encounter an
        accessibility barrier, please contact us with:
      </p>
      <ul>
        <li>The page or feature where you encountered the issue</li>
        <li>A brief description of what happened, and what you expected instead</li>
        <li>The browser, device, and any assistive technology you were using, if relevant</li>
      </ul>
      <ul>
        <li>Email: <a href="mailto:info@becoforganic.com">info@becoforganic.com</a></li>
        <li>Phone: <a href="tel:+254735283397">+254 735 283 397</a></li>
      </ul>
      <p>We aim to respond to accessibility feedback within a reasonable time and to address genuine barriers as a priority.</p>
    </section>

    <section id="changes">
      <h2>7. Changes to This Statement</h2>
      <p>
        We will update this Statement as we make further accessibility improvements or become aware of new
        issues. The "Last updated" date at the top of this page reflects the most recent revision.
      </p>
    </section>
  </LegalLayout>
);

export default AccessibilityStatement;
