import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { items as itemsApi } from '../../services/api';
import { FiSearch, FiMapPin, FiCalendar } from 'react-icons/fi';

export default function ItemList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ type: '', category: '' });

  useEffect(() => {
    setLoading(true);
    const params = { ...filter, q: search || undefined };
    itemsApi.getAll(params)
      .then((res) => setItems(res.data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, filter]);

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lost & Found Items</h1>
        <p className="text-gray-500">Browse reported items across campus</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10" placeholder="Search items..." />
        </div>
        <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          className="input-field sm:w-40">
          <option value="">All Types</option>
          <option value="lost">Lost</option>
          <option value="found">Found</option>
        </select>
        <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          className="input-field sm:w-40">
          <option value="">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="documents">Documents</option>
          <option value="clothing">Clothing</option>
          <option value="accessories">Accessories</option>
          <option value="books">Books</option>
          <option value="other">Other</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading items...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <FiSearch className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">No items found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Link key={item._id} to={`/items/${item._id}`} className="card hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <span className={`badge ${item.type === 'lost' ? 'badge-danger' : 'badge-success'}`}>
                  {item.type}
                </span>
                <span className={`badge ${item.status === 'open' ? 'badge-primary' : 'badge-warning'}`}>
                  {item.status}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">{item.title}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
              <div className="flex items-center text-sm text-gray-500 gap-4">
                <span className="flex items-center gap-1"><FiMapPin className="w-3.5 h-3.5" /> {item.location}</span>
                <span className="flex items-center gap-1"><FiCalendar className="w-3.5 h-3.5" /> {new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
