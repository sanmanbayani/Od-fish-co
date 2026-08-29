import { categories, db, productVariants, products } from "@workspace/db";
import { and, asc, eq, gt, ilike, inArray, or, sql } from "drizzle-orm";

type CategoryRow = typeof categories.$inferSelect;
type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof productVariants.$inferSelect;

export function serializeVariant(row: VariantRow) {
  const discountPercent =
    row.mrpPaise > 0 && row.mrpPaise > row.pricePaise
      ? Math.round(((row.mrpPaise - row.pricePaise) / row.mrpPaise) * 100)
      : 0;

  const perKgPaise =
    row.grossWeightG && row.grossWeightG > 0
      ? Math.round((row.pricePaise / row.grossWeightG) * 1000)
      : null;

  return {
    id: row.id,
    productId: row.productId,
    sku: row.sku,
    cutType: row.cutType,
    soldBy: row.soldBy,
    packLabel: row.packLabel,
    grossWeightG: row.grossWeightG,
    netWeightMinG: row.netWeightMinG,
    netWeightMaxG: row.netWeightMaxG,
    pieceCount: row.pieceCount,
    mrpPaise: row.mrpPaise,
    pricePaise: row.pricePaise,
    perKgPaise,
    discountPercent,
    stockQty: row.stockQty,
    lowStockAt: row.lowStockAt,
    isActive: row.isActive,
  };
}

export function serializeProduct(
  product: ProductRow,
  category: Pick<CategoryRow, "id" | "slug" | "name">,
  variants: VariantRow[],
) {
  const sellable = variants.filter((variant) => variant.isActive);
  const inStock = sellable.some((variant) => variant.stockQty > 0);
  const prices = sellable
    .filter((variant) => variant.stockQty > 0)
    .map((variant) => variant.pricePaise);
  const fallbackPrices = sellable.map((variant) => variant.pricePaise);
  const pricePool = prices.length > 0 ? prices : fallbackPrices;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    nameLocal: product.nameLocal,
    shortDesc: product.shortDesc,
    longDesc: product.longDesc,
    origin: product.origin,
    bestFor: product.bestFor,
    imageUrls: product.imageUrls,
    categoryId: category.id,
    categorySlug: category.slug,
    categoryName: category.name,
    isActive: product.isActive,
    inStock,
    fromPricePaise: pricePool.length > 0 ? Math.min(...pricePool) : null,
    variants: variants
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(serializeVariant),
  };
}

export interface ProductQuery {
  categorySlug?: string;
  search?: string;
  productSlug?: string;
  productIds?: string[];
  includeInactive?: boolean;
  featuredOnly?: boolean;
  todaysCatchOnly?: boolean;
  limit?: number;
}

/** Load products with their category and variants, already serialized. */
export async function loadProducts(query: ProductQuery = {}) {
  const filters = [];

  if (!query.includeInactive) filters.push(eq(products.isActive, true));
  if (query.categorySlug) filters.push(eq(categories.slug, query.categorySlug));
  if (query.productSlug) filters.push(eq(products.slug, query.productSlug));
  if (query.productIds) {
    if (query.productIds.length === 0) return [];
    filters.push(inArray(products.id, query.productIds));
  }
  if (query.featuredOnly) filters.push(eq(products.isFeatured, true));
  if (query.todaysCatchOnly) filters.push(eq(products.isTodaysCatch, true));
  if (query.search) {
    const term = `%${query.search.trim()}%`;
    filters.push(
      or(
        ilike(products.name, term),
        ilike(products.nameLocal, term),
        ilike(products.shortDesc, term),
        ilike(categories.name, term),
      )!,
    );
  }

  const rows = await db
    .select({ product: products, category: categories })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(asc(products.sortOrder), asc(products.name))
    .limit(query.limit ?? 200);

  if (rows.length === 0) return [];

  const variantRows = await db
    .select()
    .from(productVariants)
    .where(
      inArray(
        productVariants.productId,
        rows.map((row) => row.product.id),
      ),
    );

  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const variant of variantRows) {
    const bucket = variantsByProduct.get(variant.productId) ?? [];
    bucket.push(variant);
    variantsByProduct.set(variant.productId, bucket);
  }

  return rows.map((row) =>
    serializeProduct(
      row.product,
      row.category,
      (variantsByProduct.get(row.product.id) ?? []).filter(
        (variant) => query.includeInactive || variant.isActive,
      ),
    ),
  );
}

export async function loadCategories(activeOnly = true) {
  const counts = await db
    .select({
      categoryId: products.categoryId,
      count: sql<number>`count(*)::int`,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .groupBy(products.categoryId);

  const countByCategory = new Map(counts.map((row) => [row.categoryId, row.count]));

  const rows = await db
    .select()
    .from(categories)
    .where(activeOnly ? eq(categories.isActive, true) : undefined)
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameLocal: row.nameLocal,
    imageUrl: row.imageUrl,
    productCount: countByCategory.get(row.id) ?? 0,
  }));
}

export async function countSellableProducts(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(distinct ${products.id})::int` })
    .from(products)
    .innerJoin(productVariants, eq(productVariants.productId, products.id))
    .where(
      and(
        eq(products.isActive, true),
        eq(productVariants.isActive, true),
        gt(productVariants.stockQty, 0),
      ),
    );

  return row?.count ?? 0;
}
