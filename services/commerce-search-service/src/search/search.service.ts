import { Injectable } from '@nestjs/common';
import { pool } from '../database/pool.js';

@Injectable()
export class SearchService {
  async indexProduct(product: { productId: string; name: string; description?: string; categoryId?: string; attributes?: Record<string, unknown> }) {
    await pool.query(
      `INSERT INTO product_search_documents (product_id, name, description, category_id, attributes, search_vector)
       VALUES ($1, $2, $3, $4, $5, to_tsvector('english', $2 || ' ' || coalesce($3, '')))
       ON CONFLICT (store_id, product_id) DO UPDATE SET
         name = EXCLUDED.name, description = EXCLUDED.description, category_id = EXCLUDED.category_id,
         attributes = EXCLUDED.attributes, search_vector = EXCLUDED.search_vector,
         source_version = product_search_documents.source_version + 1, updated_at = now()`,
      [product.productId, product.name, product.description || '', product.categoryId || null, JSON.stringify(product.attributes || {})],
    );
    return { indexed: true, productId: product.productId };
  }

  async search(query: string, limit = 20, offset = 0) {
    if (!query.trim()) {
      const { rows } = await pool.query(
        `SELECT * FROM product_search_documents WHERE publication_status = 'published' ORDER BY updated_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      return rows;
    }
    const { rows } = await pool.query(
      `SELECT *, ts_rank(search_vector, plainto_tsquery('english', $1)) as rank
       FROM product_search_documents
       WHERE search_vector @@ plainto_tsquery('english', $1) AND publication_status = 'published'
       ORDER BY rank DESC LIMIT $2 OFFSET $3`,
      [query, limit, offset],
    );
    return rows;
  }

  async rebuildIndex() {
    // In production, this would re-consume all ProductPublished events
    return { status: 'rebuild_not_implemented_use_event_replay' };
  }
}
