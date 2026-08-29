/**
 * Seeds the catalogue, delivery slots, service area and staff accounts.
 * Safe to re-run: everything keys off a stable slug, sku, pincode or email.
 *
 *   pnpm --filter @workspace/api-server run seed
 */
import {
  categories,
  db,
  deliverySlots,
  productVariants,
  products,
  servicePincodes,
  staff,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./lib/logger";
import { hashPassword } from "./lib/security";
import { getStoreSettings } from "./lib/store";

const rupees = (amount: number) => Math.round(amount * 100);

interface VariantSeed {
  cutType: string;
  packLabel: string;
  grossWeightG?: number;
  netWeightMinG?: number;
  netWeightMaxG?: number;
  pieceCount?: number;
  mrp: number;
  price: number;
  stock: number;
}

interface ProductSeed {
  slug: string;
  name: string;
  nameLocal: string;
  shortDesc: string;
  longDesc: string;
  origin: string;
  bestFor: string[];
  featured?: boolean;
  todaysCatch?: boolean;
  variants: VariantSeed[];
}

interface CategorySeed {
  slug: string;
  name: string;
  nameLocal: string;
  products: ProductSeed[];
}

const CATALOGUE: CategorySeed[] = [
  {
    slug: "fresh-fish",
    name: "Fresh Fish",
    nameLocal: "ताजे मासे",
    products: [
      {
        slug: "surmai-king-fish",
        name: "Surmai",
        nameLocal: "सुरमई",
        shortDesc: "King fish steaks, firm and meaty with a single centre bone.",
        longDesc:
          "The Sunday fish of most Mumbai homes. Surmai holds its shape on the tawa, takes a green masala beautifully, and has one clean centre bone that even children can manage. We cut it into steaks the thickness of your thumb so the middle cooks through before the crust burns.",
        origin: "Sassoon Dock, Mumbai",
        bestFor: ["Tawa fry", "Green masala curry", "Grill"],
        featured: true,
        todaysCatch: true,
        variants: [
          {
            cutType: "Steaks",
            packLabel: "Medium steaks, 500g pack",
            grossWeightG: 500,
            netWeightMinG: 380,
            netWeightMaxG: 420,
            pieceCount: 4,
            mrp: 649,
            price: 579,
            stock: 24,
          },
          {
            cutType: "Steaks",
            packLabel: "Medium steaks, 1kg pack",
            grossWeightG: 1000,
            netWeightMinG: 780,
            netWeightMaxG: 840,
            pieceCount: 8,
            mrp: 1249,
            price: 1099,
            stock: 14,
          },
          {
            cutType: "Boneless cubes",
            packLabel: "Boneless cubes, 400g pack",
            grossWeightG: 400,
            netWeightMinG: 380,
            netWeightMaxG: 400,
            mrp: 799,
            price: 719,
            stock: 9,
          },
        ],
      },
      {
        slug: "white-pomfret",
        name: "White Pomfret",
        nameLocal: "पापलेट",
        shortDesc: "The celebration fish. Sweet, delicate, almost no small bones.",
        longDesc:
          "Paplet is what comes out when there is something to celebrate. Sweet white flesh, a flat frame that fries evenly, and so few bones that it is the safest fish to serve guests. Cleaned whole with two slashes on each side so the masala reaches the middle.",
        origin: "Versova, Mumbai",
        bestFor: ["Whole tawa fry", "Recheado", "Steamed in banana leaf"],
        featured: true,
        todaysCatch: true,
        variants: [
          {
            cutType: "Whole, cleaned",
            packLabel: "Medium, 1 piece (300-400g)",
            grossWeightG: 350,
            netWeightMinG: 250,
            netWeightMaxG: 300,
            pieceCount: 1,
            mrp: 749,
            price: 679,
            stock: 12,
          },
          {
            cutType: "Whole, cleaned",
            packLabel: "Large, 1 piece (450-550g)",
            grossWeightG: 500,
            netWeightMinG: 370,
            netWeightMaxG: 430,
            pieceCount: 1,
            mrp: 1099,
            price: 989,
            stock: 7,
          },
        ],
      },
      {
        slug: "black-pomfret-halwa",
        name: "Black Pomfret",
        nameLocal: "हलवा",
        shortDesc: "Halwa. Richer and oilier than white paplet, superb in curry.",
        longDesc:
          "Halwa carries more oil than its white cousin, which is exactly why it stands up to a strong coconut curry without falling apart. Sold whole and cleaned, or cut into curry pieces if you would rather skip the work.",
        origin: "Sassoon Dock, Mumbai",
        bestFor: ["Coconut curry", "Tawa fry"],
        variants: [
          {
            cutType: "Whole, cleaned",
            packLabel: "1 piece (400-500g)",
            grossWeightG: 450,
            netWeightMinG: 330,
            netWeightMaxG: 390,
            pieceCount: 1,
            mrp: 549,
            price: 479,
            stock: 11,
          },
          {
            cutType: "Curry cut",
            packLabel: "Curry cut, 500g pack",
            grossWeightG: 500,
            netWeightMinG: 400,
            netWeightMaxG: 440,
            mrp: 599,
            price: 529,
            stock: 8,
          },
        ],
      },
      {
        slug: "bangda-mackerel",
        name: "Bangda",
        nameLocal: "बांगडा",
        shortDesc: "Indian mackerel. Oily, full-flavoured, the weekday workhorse.",
        longDesc:
          "Bangda is the fish most Mumbai kitchens actually cook on a Tuesday. Strong flavour, plenty of omega-3, and it costs a fraction of surmai. Ask for it stuffed with green masala and shallow fried, and you will understand why it never goes out of fashion.",
        origin: "Ratnagiri coast",
        bestFor: ["Stuffed fry", "Kolambi masala", "Sukka"],
        todaysCatch: true,
        variants: [
          {
            cutType: "Whole, cleaned",
            packLabel: "4 pieces, 500g pack",
            grossWeightG: 500,
            netWeightMinG: 360,
            netWeightMaxG: 400,
            pieceCount: 4,
            mrp: 329,
            price: 279,
            stock: 30,
          },
          {
            cutType: "Butterfly cut",
            packLabel: "Butterfly cut, 500g pack",
            grossWeightG: 500,
            netWeightMinG: 350,
            netWeightMaxG: 390,
            pieceCount: 4,
            mrp: 369,
            price: 319,
            stock: 16,
          },
        ],
      },
      {
        slug: "rawas-indian-salmon",
        name: "Rawas",
        nameLocal: "रावस",
        shortDesc: "Indian salmon. Big flakes, mild taste, very forgiving to cook.",
        longDesc:
          "Rawas is the fish to hand to someone who says they do not like fish. Mild, large-flaked, and almost impossible to overcook into something inedible. The boneless fillet is popular with families feeding small children.",
        origin: "Sassoon Dock, Mumbai",
        bestFor: ["Fillet fry", "Butter garlic", "Baked"],
        featured: true,
        variants: [
          {
            cutType: "Steaks",
            packLabel: "Steaks, 500g pack",
            grossWeightG: 500,
            netWeightMinG: 400,
            netWeightMaxG: 440,
            pieceCount: 4,
            mrp: 599,
            price: 529,
            stock: 15,
          },
          {
            cutType: "Boneless fillet",
            packLabel: "Boneless fillet, 400g pack",
            grossWeightG: 400,
            netWeightMinG: 380,
            netWeightMaxG: 400,
            pieceCount: 2,
            mrp: 749,
            price: 669,
            stock: 10,
          },
        ],
      },
      {
        slug: "bombil-bombay-duck",
        name: "Bombil",
        nameLocal: "बोंबील",
        shortDesc: "Bombay duck. Soft as custard inside, shatteringly crisp outside.",
        longDesc:
          "Nothing else eats like a properly fried bombil: rava crust outside, almost liquid inside. It is fragile, so we clean it the same morning and pack it flat. Fry it the day it arrives.",
        origin: "Versova, Mumbai",
        bestFor: ["Rava fry", "Dry sukka"],
        todaysCatch: true,
        variants: [
          {
            cutType: "Cleaned, split",
            packLabel: "6 pieces, 400g pack",
            grossWeightG: 400,
            netWeightMinG: 300,
            netWeightMaxG: 340,
            pieceCount: 6,
            mrp: 349,
            price: 299,
            stock: 18,
          },
        ],
      },
      {
        slug: "ghol-croaker",
        name: "Ghol",
        nameLocal: "घोळ",
        shortDesc: "Croaker. Firm white flesh, prized for curries and soups.",
        longDesc:
          "Ghol has a quiet reputation among people who cook fish often: firm, clean-tasting flesh that does not disintegrate in a long-simmered curry, and a head that makes a superb stock.",
        origin: "Alibaug coast",
        bestFor: ["Curry", "Fish soup", "Steam"],
        variants: [
          {
            cutType: "Curry cut",
            packLabel: "Curry cut, 500g pack",
            grossWeightG: 500,
            netWeightMinG: 400,
            netWeightMaxG: 440,
            mrp: 529,
            price: 469,
            stock: 9,
          },
        ],
      },
      {
        slug: "tarli-sardine",
        name: "Tarli",
        nameLocal: "तारली",
        shortDesc: "Sardines. Small, oily, best fried hard with a red masala.",
        longDesc:
          "Cheap, oily, deeply flavoured. Tarli is the fish of Koli home cooking, coated in a red masala and fried until the tails go crisp. Cleaned and de-scaled so you only have to marinate.",
        origin: "Ratnagiri coast",
        bestFor: ["Red masala fry", "Sukka"],
        variants: [
          {
            cutType: "Whole, cleaned",
            packLabel: "500g pack",
            grossWeightG: 500,
            netWeightMinG: 340,
            netWeightMaxG: 380,
            mrp: 289,
            price: 239,
            stock: 20,
          },
        ],
      },
      {
        slug: "kane-lady-fish",
        name: "Kane",
        nameLocal: "काणे",
        shortDesc: "Lady fish. Delicate, sweet, a Mangalorean favourite.",
        longDesc:
          "Kane is thin, sweet and cooks in minutes. Rava-fried whole is the classic treatment, and the flesh lifts cleanly off the frame once it is done.",
        origin: "Malvan coast",
        bestFor: ["Rava fry", "Ghee roast"],
        variants: [
          {
            cutType: "Whole, cleaned",
            packLabel: "5-6 pieces, 500g pack",
            grossWeightG: 500,
            netWeightMinG: 350,
            netWeightMaxG: 390,
            pieceCount: 6,
            mrp: 449,
            price: 389,
            stock: 12,
          },
        ],
      },
      {
        slug: "rohu",
        name: "Rohu",
        nameLocal: "रोहू",
        shortDesc: "Freshwater carp, cut for a classic mustard or tomato curry.",
        longDesc:
          "For homes that grew up on river fish rather than sea fish. Rohu is soft, sweet and made for a mustard curry. Cut into standard curry pieces, scales off, gut cleaned.",
        origin: "Bhandara, Maharashtra",
        bestFor: ["Mustard curry", "Kalia", "Fry"],
        variants: [
          {
            cutType: "Curry cut",
            packLabel: "Curry cut, 1kg pack",
            grossWeightG: 1000,
            netWeightMinG: 780,
            netWeightMaxG: 850,
            mrp: 469,
            price: 399,
            stock: 13,
          },
        ],
      },
    ],
  },
  {
    slug: "prawns-shellfish",
    name: "Prawns & Shellfish",
    nameLocal: "कोळंबी",
    products: [
      {
        slug: "medium-prawns",
        name: "Prawns, Medium",
        nameLocal: "कोळंबी",
        shortDesc: "Cleaned and deveined. The everyday prawn for curries and pulao.",
        longDesc:
          "Medium prawns, shelled, deveined and rinsed, so the pack goes straight into the pan. This is the size that works for prawn curry, prawn pulao and koliwada alike.",
        origin: "Sassoon Dock, Mumbai",
        bestFor: ["Prawn curry", "Pulao", "Koliwada"],
        featured: true,
        variants: [
          {
            cutType: "Peeled & deveined",
            packLabel: "250g pack",
            grossWeightG: 250,
            netWeightMinG: 240,
            netWeightMaxG: 250,
            mrp: 429,
            price: 379,
            stock: 22,
          },
          {
            cutType: "Peeled & deveined",
            packLabel: "500g pack",
            grossWeightG: 500,
            netWeightMinG: 480,
            netWeightMaxG: 500,
            mrp: 829,
            price: 719,
            stock: 14,
          },
        ],
      },
      {
        slug: "tiger-prawns",
        name: "Tiger Prawns",
        nameLocal: "वाघी कोळंबी",
        shortDesc: "Large, striped, dramatic. Butter garlic or the grill.",
        longDesc:
          "The prawn you buy when the meal has to look like an occasion. Head and shell left on for flavour, deveined along the back so they butterfly open on the grill.",
        origin: "Gujarat coast",
        bestFor: ["Butter garlic", "Grill", "Tandoor"],
        featured: true,
        variants: [
          {
            cutType: "Shell on, deveined",
            packLabel: "6-8 pieces, 400g pack",
            grossWeightG: 400,
            netWeightMinG: 260,
            netWeightMaxG: 300,
            pieceCount: 7,
            mrp: 949,
            price: 849,
            stock: 8,
          },
        ],
      },
      {
        slug: "karandi-small-prawns",
        name: "Karandi",
        nameLocal: "करंदी",
        shortDesc: "Tiny prawns for a dry sukka with plenty of coconut.",
        longDesc:
          "Small, sweet and fiddly to clean, which is why we do it for you. Karandi sukka with grated coconut and a hot bhakri is one of the great Maharashtrian weekday meals.",
        origin: "Versova, Mumbai",
        bestFor: ["Sukka", "Bhaji", "Kismur"],
        variants: [
          {
            cutType: "Cleaned",
            packLabel: "250g pack",
            grossWeightG: 250,
            netWeightMinG: 240,
            netWeightMaxG: 250,
            mrp: 329,
            price: 279,
            stock: 16,
          },
        ],
      },
      {
        slug: "tisrya-clams",
        name: "Tisrya",
        nameLocal: "तिसऱ्या",
        shortDesc: "Clams in the half shell, scrubbed and ready for masala.",
        longDesc:
          "Tisrya masala is a Malvani institution. We scrub the shells, purge the sand and pack them on the half shell so all you do is throw them into the pan with coconut and kokum.",
        origin: "Malvan coast",
        bestFor: ["Tisrya masala", "Sukka", "Steamed"],
        variants: [
          {
            cutType: "Half shell",
            packLabel: "500g pack",
            grossWeightG: 500,
            netWeightMinG: 200,
            netWeightMaxG: 250,
            mrp: 379,
            price: 329,
            stock: 10,
          },
        ],
      },
      {
        slug: "mussels",
        name: "Mussels",
        nameLocal: "शिनाणे",
        shortDesc: "Green mussels, de-bearded and scrubbed clean.",
        longDesc:
          "Green mussels, beards pulled and shells scrubbed. Steam them open with garlic and kokum, or stuff and fry them the Malvani way.",
        origin: "Malvan coast",
        bestFor: ["Steamed", "Stuffed fry", "Masala"],
        variants: [
          {
            cutType: "Half shell",
            packLabel: "500g pack",
            grossWeightG: 500,
            netWeightMinG: 190,
            netWeightMaxG: 240,
            mrp: 349,
            price: 299,
            stock: 9,
          },
        ],
      },
    ],
  },
  {
    slug: "crab-lobster",
    name: "Crab & Lobster",
    nameLocal: "खेकडा",
    products: [
      {
        slug: "mud-crab",
        name: "Mud Crab",
        nameLocal: "चिंबोरी",
        shortDesc: "Live-cleaned mud crab, cut into curry portions.",
        longDesc:
          "Heavy claws, sweet meat, and a shell that flavours the whole curry. Cleaned and portioned the same morning. Chimbori kalvan is worth every bit of the mess it makes.",
        origin: "Vasai creek",
        bestFor: ["Chimbori kalvan", "Butter pepper garlic", "Sukka"],
        featured: true,
        variants: [
          {
            cutType: "Cleaned & cut",
            packLabel: "2 pieces, 700g pack",
            grossWeightG: 700,
            netWeightMinG: 420,
            netWeightMaxG: 480,
            pieceCount: 2,
            mrp: 899,
            price: 799,
            stock: 6,
          },
        ],
      },
      {
        slug: "lobster",
        name: "Rock Lobster",
        nameLocal: "शेवंड",
        shortDesc: "Shevand. Cleaned, halved, ready for the grill.",
        longDesc:
          "Rock lobster, split down the middle and cleaned so it goes straight under the grill with butter and garlic. Limited catch, so it sells out most days by mid-morning.",
        origin: "Ratnagiri coast",
        bestFor: ["Grill", "Butter garlic", "Thermidor"],
        variants: [
          {
            cutType: "Halved, cleaned",
            packLabel: "1 piece (450-550g)",
            grossWeightG: 500,
            netWeightMinG: 230,
            netWeightMaxG: 280,
            pieceCount: 1,
            mrp: 1699,
            price: 1499,
            stock: 4,
          },
        ],
      },
    ],
  },
  {
    slug: "dried-cured",
    name: "Dried & Cured",
    nameLocal: "सुके मासे",
    products: [
      {
        slug: "dried-bombil",
        name: "Dried Bombil",
        nameLocal: "सुके बोंबील",
        shortDesc: "Sun-dried Bombay duck. Pantry staple, roasted or fried.",
        longDesc:
          "Dried on the Versova racks the traditional way. Roast it over an open flame, pound it with garlic and red chilli, and it will outlast anything else in your pantry.",
        origin: "Versova, Mumbai",
        bestFor: ["Chutney", "Fry", "Sukka"],
        variants: [
          {
            cutType: "Sun-dried",
            packLabel: "10 pieces, 200g pack",
            grossWeightG: 200,
            pieceCount: 10,
            mrp: 399,
            price: 349,
            stock: 25,
          },
        ],
      },
      {
        slug: "dried-prawns-sode",
        name: "Dried Prawns",
        nameLocal: "सोडे",
        shortDesc: "Sode. Intensely savoury, a little goes a long way.",
        longDesc:
          "Sun-dried prawns with the shells off. A handful transforms a plain vegetable bhaji, and sode khichdi is comfort food for half of Maharashtra.",
        origin: "Alibaug coast",
        bestFor: ["Khichdi", "Bhaji", "Chutney"],
        variants: [
          {
            cutType: "Sun-dried, peeled",
            packLabel: "200g pack",
            grossWeightG: 200,
            mrp: 449,
            price: 389,
            stock: 20,
          },
        ],
      },
      {
        slug: "dried-mandeli",
        name: "Dried Mandeli",
        nameLocal: "सुकी मांदेली",
        shortDesc: "Dried anchovy, crisp-fried in minutes.",
        longDesc:
          "Small dried anchovy that crisps up in hot oil almost instantly. Eaten as a side, crushed into chutney, or thrown into a dry bhaji.",
        origin: "Versova, Mumbai",
        bestFor: ["Fry", "Chutney"],
        variants: [
          {
            cutType: "Sun-dried",
            packLabel: "200g pack",
            grossWeightG: 200,
            mrp: 319,
            price: 269,
            stock: 18,
          },
        ],
      },
    ],
  },
  {
    slug: "ready-to-cook",
    name: "Ready to Cook",
    nameLocal: "तयार मसाला",
    products: [
      {
        slug: "surmai-tawa-masala",
        name: "Surmai Tawa Masala",
        nameLocal: "मसाला सुरमई",
        shortDesc: "Surmai steaks already marinated in green Koli masala.",
        longDesc:
          "Our own green masala - coriander, green chilli, ginger, garlic, a squeeze of lime - rubbed into surmai steaks and rested overnight. Dust with rava and fry. Twelve minutes from fridge to table.",
        origin: "Prepared in Mumbai",
        bestFor: ["Tawa fry"],
        featured: true,
        variants: [
          {
            cutType: "Marinated steaks",
            packLabel: "4 steaks, 400g pack",
            grossWeightG: 400,
            netWeightMinG: 380,
            netWeightMaxG: 400,
            pieceCount: 4,
            mrp: 649,
            price: 579,
            stock: 10,
          },
        ],
      },
      {
        slug: "prawns-koliwada",
        name: "Prawns Koliwada Mix",
        nameLocal: "कोळीवाडा कोळंबी",
        shortDesc: "Deveined prawns in the red koliwada batter. Just fry.",
        longDesc:
          "Cleaned prawns tossed in the red, tangy, garlicky koliwada batter that every Mumbai bar snack owes its existence to. Deep fry for three minutes and finish with lime.",
        origin: "Prepared in Mumbai",
        bestFor: ["Deep fry", "Starter"],
        variants: [
          {
            cutType: "Battered",
            packLabel: "300g pack",
            grossWeightG: 300,
            netWeightMinG: 290,
            netWeightMaxG: 300,
            mrp: 529,
            price: 469,
            stock: 12,
          },
        ],
      },
      {
        slug: "fish-curry-cut-combo",
        name: "Curry Cut Combo",
        nameLocal: "कालवण कॉम्बो",
        shortDesc: "Two fish, curry cut, enough for a family of four.",
        longDesc:
          "A pack of bangda and a pack of ghol, both cut for curry, priced together. The easiest way to cook two different fish in one week without a second trip.",
        origin: "Sassoon Dock, Mumbai",
        bestFor: ["Curry", "Weekly stock-up"],
        variants: [
          {
            cutType: "Curry cut",
            packLabel: "1kg combo pack",
            grossWeightG: 1000,
            netWeightMinG: 780,
            netWeightMaxG: 850,
            mrp: 899,
            price: 749,
            stock: 8,
          },
        ],
      },
    ],
  },
];

const SLOTS = [
  {
    label: "7 AM - 10 AM",
    startTime: "07:00",
    endTime: "10:00",
    cutoffTime: "23:00",
    capacity: 60,
    sortOrder: 1,
  },
  {
    label: "11 AM - 2 PM",
    startTime: "11:00",
    endTime: "14:00",
    cutoffTime: "09:00",
    capacity: 50,
    sortOrder: 2,
  },
  {
    label: "4 PM - 7 PM",
    startTime: "16:00",
    endTime: "19:00",
    cutoffTime: "13:00",
    capacity: 50,
    sortOrder: 3,
  },
  {
    label: "7 PM - 10 PM",
    startTime: "19:00",
    endTime: "22:00",
    cutoffTime: "16:00",
    capacity: 40,
    sortOrder: 4,
  },
];

const PINCODES: [string, string][] = [
  ["400001", "Fort"],
  ["400005", "Colaba"],
  ["400007", "Grant Road"],
  ["400012", "Parel"],
  ["400013", "Lower Parel"],
  ["400014", "Dadar East"],
  ["400016", "Mahim"],
  ["400018", "Worli"],
  ["400019", "Matunga"],
  ["400020", "Churchgate"],
  ["400022", "Sion"],
  ["400025", "Prabhadevi"],
  ["400026", "Cumballa Hill"],
  ["400028", "Dadar West"],
  ["400030", "Worli Naka"],
  ["400049", "Juhu"],
  ["400050", "Bandra West"],
  ["400051", "Bandra East"],
  ["400052", "Khar West"],
  ["400053", "Andheri West"],
  ["400054", "Santacruz West"],
  ["400055", "Santacruz East"],
  ["400056", "Vile Parle West"],
  ["400057", "Vile Parle East"],
  ["400058", "Andheri Lokhandwala"],
  ["400059", "Marol"],
  ["400061", "Versova"],
  ["400062", "Goregaon West"],
  ["400063", "Goregaon East"],
  ["400064", "Malad West"],
  ["400076", "Powai"],
  ["400080", "Mulund West"],
  ["400093", "Andheri MIDC"],
  ["400102", "Jogeshwari West"],
  ["400104", "Oshiwara"],
];

async function seedCatalogue(): Promise<void> {
  for (const [categoryIndex, categorySeed] of CATALOGUE.entries()) {
    const [category] = await db
      .insert(categories)
      .values({
        slug: categorySeed.slug,
        name: categorySeed.name,
        nameLocal: categorySeed.nameLocal,
        imageUrl: `/api/media/categories/${categorySeed.slug}.png`,
        sortOrder: categoryIndex + 1,
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name: categorySeed.name,
          nameLocal: categorySeed.nameLocal,
          imageUrl: `/api/media/categories/${categorySeed.slug}.png`,
          sortOrder: categoryIndex + 1,
          isActive: true,
        },
      })
      .returning();

    if (!category) continue;

    for (const [productIndex, productSeed] of categorySeed.products.entries()) {
      const imageUrl = `/api/media/products/${productSeed.slug}.png`;
      const [product] = await db
        .insert(products)
        .values({
          slug: productSeed.slug,
          name: productSeed.name,
          nameLocal: productSeed.nameLocal,
          shortDesc: productSeed.shortDesc,
          longDesc: productSeed.longDesc,
          origin: productSeed.origin,
          bestFor: productSeed.bestFor,
          imageUrls: [imageUrl],
          categoryId: category.id,
          isFeatured: productSeed.featured ?? false,
          isTodaysCatch: productSeed.todaysCatch ?? false,
          sortOrder: productIndex + 1,
        })
        .onConflictDoUpdate({
          target: products.slug,
          set: {
            name: productSeed.name,
            nameLocal: productSeed.nameLocal,
            shortDesc: productSeed.shortDesc,
            longDesc: productSeed.longDesc,
            origin: productSeed.origin,
            bestFor: productSeed.bestFor,
            imageUrls: [imageUrl],
            categoryId: category.id,
            isFeatured: productSeed.featured ?? false,
            isTodaysCatch: productSeed.todaysCatch ?? false,
            sortOrder: productIndex + 1,
            isActive: true,
          },
        })
        .returning();

      if (!product) continue;

      for (const [variantIndex, variantSeed] of productSeed.variants.entries()) {
        const sku = `${productSeed.slug.toUpperCase().replaceAll("-", "")}-${variantIndex + 1}`;
        await db
          .insert(productVariants)
          .values({
            productId: product.id,
            sku,
            cutType: variantSeed.cutType,
            soldBy: "PACK",
            packLabel: variantSeed.packLabel,
            grossWeightG: variantSeed.grossWeightG ?? null,
            netWeightMinG: variantSeed.netWeightMinG ?? null,
            netWeightMaxG: variantSeed.netWeightMaxG ?? null,
            pieceCount: variantSeed.pieceCount ?? null,
            mrpPaise: rupees(variantSeed.mrp),
            pricePaise: rupees(variantSeed.price),
            stockQty: variantSeed.stock,
            lowStockAt: 5,
            sortOrder: variantIndex + 1,
          })
          .onConflictDoUpdate({
            target: productVariants.sku,
            set: {
              cutType: variantSeed.cutType,
              packLabel: variantSeed.packLabel,
              grossWeightG: variantSeed.grossWeightG ?? null,
              netWeightMinG: variantSeed.netWeightMinG ?? null,
              netWeightMaxG: variantSeed.netWeightMaxG ?? null,
              pieceCount: variantSeed.pieceCount ?? null,
              mrpPaise: rupees(variantSeed.mrp),
              pricePaise: rupees(variantSeed.price),
              stockQty: variantSeed.stock,
              sortOrder: variantIndex + 1,
              isActive: true,
            },
          });
      }
    }
  }
}

async function seedSlots(): Promise<void> {
  for (const slot of SLOTS) {
    const [existing] = await db
      .select({ id: deliverySlots.id })
      .from(deliverySlots)
      .where(eq(deliverySlots.label, slot.label))
      .limit(1);

    if (existing) {
      await db.update(deliverySlots).set(slot).where(eq(deliverySlots.id, existing.id));
    } else {
      await db.insert(deliverySlots).values(slot);
    }
  }
}

async function seedPincodes(): Promise<void> {
  for (const [pincode, areaName] of PINCODES) {
    await db
      .insert(servicePincodes)
      .values({ pincode, areaName })
      .onConflictDoUpdate({
        target: servicePincodes.pincode,
        set: { areaName, isActive: true },
      });
  }
}

/**
 * Demo staff accounts. These exist so the console is usable the moment the app
 * boots; rotate them before the store takes real orders.
 */
const STAFF = [
  {
    email: "admin@odfishco.in",
    password: "OdFish@2026",
    fullName: "Anjali Kadam",
    phone: "9820011223",
    role: "ADMIN" as const,
  },
  {
    email: "ops@odfishco.in",
    password: "OdFish@2026",
    fullName: "Sameer Tandel",
    phone: "9820044556",
    role: "OPS" as const,
  },
  {
    email: "rider@odfishco.in",
    password: "OdFish@2026",
    fullName: "Ravi Koli",
    phone: "9820077889",
    role: "RIDER" as const,
  },
  {
    email: "rider2@odfishco.in",
    password: "OdFish@2026",
    fullName: "Nitin Bhoir",
    phone: "9820099001",
    role: "RIDER" as const,
  },
];

async function seedStaff(): Promise<void> {
  for (const member of STAFF) {
    const passwordHash = await hashPassword(member.password);
    await db
      .insert(staff)
      .values({
        email: member.email,
        passwordHash,
        fullName: member.fullName,
        phone: member.phone,
        role: member.role,
      })
      .onConflictDoUpdate({
        target: staff.email,
        set: {
          fullName: member.fullName,
          phone: member.phone,
          role: member.role,
          isActive: true,
        },
      });
  }
}

async function main(): Promise<void> {
  logger.info("Seeding OD Fish Co.");
  await getStoreSettings();
  await seedCatalogue();
  await seedSlots();
  await seedPincodes();
  await seedStaff();

  const productCount = CATALOGUE.reduce(
    (sum, category) => sum + category.products.length,
    0,
  );
  logger.info(
    {
      categories: CATALOGUE.length,
      products: productCount,
      slots: SLOTS.length,
      pincodes: PINCODES.length,
      staff: STAFF.length,
    },
    "Seed complete",
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    logger.error({ err: error }, "Seed failed");
    process.exit(1);
  });
