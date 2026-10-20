export type Category = {
  slug: string;
  name: string;
  description: string;
  tasks: string[];
  startingPriceInr: number;
  image: string;
  sort: number;
};

export const CATEGORIES: Category[] = [
  {
    slug: "plumbing",
    name: "Plumbing",
    description: "Leaks, blocks, fittings, and everyday water repairs at home.",
    tasks: ["Leaking taps and mixers", "Blocked drains", "Flush tank repair", "Pipe and joint fittings"],
    startingPriceInr: 299,
    image: "/media/plumbing.jpg",
    sort: 1,
  },
  {
    slug: "electrical",
    name: "Electrical work",
    description: "Safe fixes for switches, fans, lights, and small wiring faults.",
    tasks: ["Switch and socket replacement", "Fan repair", "Light fitting", "MCB tripping checks"],
    startingPriceInr: 349,
    image: "/media/electrical.jpg",
    sort: 2,
  },
  {
    slug: "cleaning",
    name: "Home cleaning",
    description: "Deep and regular home cleaning with a clear visit length.",
    tasks: ["Full home deep clean", "Kitchen and bathroom", "Move-in / move-out", "Sofa and surface wipe-down"],
    startingPriceInr: 799,
    image: "/media/cleaning.jpg",
    sort: 3,
  },
  {
    slug: "appliance",
    name: "Appliance repair",
    description: "Washing machines, geysers, microwaves, and similar home appliances.",
    tasks: ["Washing machine faults", "Geyser heating issues", "Microwave repair", "Water purifier service"],
    startingPriceInr: 399,
    image: "/media/appliance.jpg",
    sort: 4,
  },
  {
    slug: "carpentry",
    name: "Carpentry",
    description: "Furniture repair, fittings, and small woodwork inside the home.",
    tasks: ["Door and hinge repair", "Shelf fitting", "Bed and wardrobe fixes", "Curtain rod installation"],
    startingPriceInr: 449,
    image: "/media/carpentry.jpg",
    sort: 5,
  },
  {
    slug: "painting",
    name: "Painting",
    description: "Room touch-ups and fresh coats, priced as an estimate until the area is seen.",
    tasks: ["Single wall touch-up", "One-room repaint", "Door and grille paint", "Damp patch prep"],
    startingPriceInr: 999,
    image: "/media/painting.jpg",
    sort: 6,
  },
  {
    slug: "pest",
    name: "Pest control",
    description: "Cockroach, ant, and general household pest treatment.",
    tasks: ["Cockroach treatment", "Ant control", "General home spray", "Kitchen and drain focus"],
    startingPriceInr: 699,
    image: "/media/pest.jpg",
    sort: 7,
  },
  {
    slug: "ac",
    name: "AC and refrigerator repair",
    description: "Cooling complaints, servicing, and common refrigerator faults.",
    tasks: ["AC not cooling", "AC service", "Refrigerator not cooling", "Gas and filter checks"],
    startingPriceInr: 499,
    image: "/media/ac.jpg",
    sort: 8,
  },
  {
    slug: "maintenance",
    name: "General home maintenance",
    description: "The odd jobs that keep a home running — fittings, fans, and small repairs.",
    tasks: ["Curtain and blind fitting", "Furniture tightening", "Minor masonry patch", "Multi-point handyman visit"],
    startingPriceInr: 349,
    image: "/media/maintenance.jpg",
    sort: 9,
  },
];

export const CATEGORY_HOURS: Record<string, number> = {
  plumbing: 1.5,
  electrical: 1.5,
  cleaning: 2.5,
  appliance: 1.75,
  carpentry: 3,
  painting: 4,
  pest: 2,
  ac: 2,
  maintenance: 2,
};

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
