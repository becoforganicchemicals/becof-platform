import Layout from "@/components/layout/Layout";
import { motion } from "framer-motion";
import SEO from "@/components/SEO";
import { Target, Eye, Leaf, Users, Scale, Lightbulb, Handshake, TrendingUp, Globe, Smile, Settings, Rocket, } from "lucide-react";


const values = [
  {
    icon: Leaf,
    title: "Sustainability",
    desc: "We are committed to sustainable product development that safeguards future generations and the planet.",
  },
  {
    icon: Users,
    title: "Community",
    desc: "We empower farmers and agricultural communities across Africa through innovation and partnership.",
  },
  {
    icon: Scale,
    title: "Integrity",
    desc: "We uphold ethical, transparent, and accountable practices in every aspect of our operations.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    desc: "We pioneer biotechnology-driven solutions that redefine sustainable agriculture.",
  },
  {
    icon: Handshake,
    title: "Customer-Centricity",
    desc: "We deeply understand and serve the unique needs of farmers, distributors, and partners.",
  },
];


const principles = [
  {
    icon: TrendingUp,
    title: "Betterment",
    desc: "A relentless commitment to improvement, progress, and industry advancement.",
  },
  {
    icon: Globe,
    title: "Environment",
    desc: "Eco-conscious innovation that reduces pollution and preserves natural ecosystems.",
  },
  {
    icon: Smile,
    title: "Customer Satisfaction",
    desc: "Delivering dependable, high-quality solutions that farmers trust.",
  },
  {
    icon: Settings,
    title: "Optimization",
    desc: "Enhancing efficiency, performance, and sustainable outcomes in every process.",
  },
  {
    icon: Rocket,
    title: "Future",
    desc: "Shaping the next era of sustainable chemical solutions and agricultural resilience.",
  },
];

const leadership = [
  {
    name: "Eng. Benjamin Baya",
    role: "Founder & Chief Executive Officer",
    bio: "Visionary engineer and sustainability advocate passionate about eco-friendly chemical innovation and agricultural transformation.",
    image: "/images/benjamin-baya.jpg"
  },
  {
    name: "Eng. Andrew Omwenga",
    role: "Co-Founder & Chief Operating Officer",
    bio: "Strategic thinker and technical leader focused on operational excellence, innovation, and sustainable agricultural impact.",
    image: "/images/andrew-omwenga.jpeg"
  },
];

const timeline = [
  {
    date: "October 2023",
    title: "Becof Chemicals Founded",
    description:
      "Eng. Benjamin Baya registered Becof Chemicals as a business name, planting the first seeds of a sustainable chemical vision.",
  },
  {
    date: "December 27, 2023",
    title: "Operational Launch",
    description:
      "Becof Chemicals officially began operations, focusing on redefining chemical manufacturing for environmental safety and agricultural transformation.",
  },
  {
    date: "November 20, 2024",
    title: "Incorporation as Limited Company",
    description:
      "Becof Organic Chemicals Limited was officially incorporated as a Private Limited Company, marking a new era of growth and structured expansion.",
  },
  {
    date: "Present",
    title: "Building the Future",
    description:
      "With two Director Shareholders, Becof continues pioneering eco-friendly agricultural solutions that protect human health and nurture the environment.",
  },
];


const About = () => (
  <Layout>
    <SEO
      title="About"
      description="Learn about our company, leadership, and commitment to sustainable organic chemical manufacturing."
      url="https://www.becoforganicchemicals.com/about"
    />
    <section className="py-16">
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl font-bold mb-6">About Becof</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Becof Organic Chemicals Limited is an innovative agri-biotechnology company transforming agricultural sustainability in Kenya and beyond.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="bg-card rounded-2xl border border-border p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Our Vision</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              To lead the global transformation towards safer and more sustainable agriculture by pioneering innovative, eco-friendly chemical solutions that protect human health, enhance environmental well-being, and empower communities.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="bg-card rounded-2xl border border-border p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-6 w-6 text-secondary" />
              <h2 className="text-2xl font-bold">Our Mission</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              To innovate and manufacture a diverse range of eco-friendly chemical products that reduce environmental pollution, protect human health, and promote sustainable agricultural practices.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 mt-24"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Core Values</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The principles that guide every innovation, partnership, and decision we make.
          </p>
        </motion.div>
        <div className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto">
          {values.slice(0, 3).map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                <v.icon className="h-7 w-7 text-primary group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-semibold text-xl mb-3">{v.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2 mt-8 max-w-4xl mx-auto">
          {values.slice(3).map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6 group-hover:bg-secondary group-hover:text-white transition-all">
                <v.icon className="h-7 w-7 text-secondary group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-semibold text-xl mb-3">{v.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 mt-24"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Becof Principles</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The operational commitments that shape how we build, serve, and grow.
          </p>
        </motion.div>
        <div className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto">
          {principles.slice(0, 3).map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                <p.icon className="h-7 w-7 text-primary group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-semibold text-xl mb-3">{p.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2 mt-8 max-w-4xl mx-auto">
          {principles.slice(3).map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6 group-hover:bg-secondary group-hover:text-white transition-all">
                <p.icon className="h-7 w-7 text-secondary group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-semibold text-xl mb-3">{p.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Leadership Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-32"
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Leadership Team
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The minds and mission driving Becof’s transformation in sustainable agriculture.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
            {leadership.map((leader, i) => (
              <motion.div
                key={leader.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center"
              >
                <img
                  src={leader.image}
                  alt={leader.name}
                  className="w-32 h-32 mx-auto rounded-full object-cover mb-6 border-4 border-primary/20"
                />
                <h3 className="text-xl font-semibold mb-1">
                  {leader.name}
                </h3>
                <p className="text-primary font-medium mb-4">
                  {leader.role}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {leader.bio}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Company Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-32"
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our Journey
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From vision to incorporation — a timeline of purpose, growth, and transformation.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="absolute left-4 top-0 bottom-0 w-1 bg-border hidden md:block" />

            {timeline.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative md:pl-16 mb-12"
              >
                <div className="hidden md:block absolute left-0 top-2 w-8 h-8 rounded-full bg-primary" />
                <div className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition">
                  <span className="text-sm text-secondary font-semibold">
                    {item.date}
                  </span>
                  <h3 className="text-lg font-semibold mt-2 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  </Layout>
);

export default About;
