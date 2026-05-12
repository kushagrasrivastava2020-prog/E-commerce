import React, { useEffect, useState } from 'react';
import { recApi } from '../../api/recommendations';
import RecRow from './RecRow';

const SimilarProducts = ({ productId }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    recApi.similar(productId, 8)
      .then(r => { if (!cancelled) setItems(r.data.data || []); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [productId]);

  return (
    <RecRow
      title="You might also like"
      subtitle="Similar products from the catalog"
      products={items}
    />
  );
};

export default SimilarProducts;
