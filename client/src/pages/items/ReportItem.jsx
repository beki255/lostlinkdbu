import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { items as itemsApi } from '../../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { FiUpload, FiX } from 'react-icons/fi';

const MIN_LENGTH = { title: 3, description: 10, category: 2, location: 2 };

const validateField = (name, value) => {
  const trimmed = value.trim();
  if (!trimmed) return `${name} is required`;
  if (MIN_LENGTH[name] && trimmed.length < MIN_LENGTH[name]) {
    return `${name} must be at least ${MIN_LENGTH[name]} characters`;
  }
  return '';
};

const validateForm = (form, files) => {
  const errors = {};
  const fields = ['title', 'description', 'category', 'location'];
  for (const field of fields) {
    const err = validateField(field, form[field]);
    if (err) errors[field] = err;
  }
  if (form.type === 'found' && files.length === 0) {
    errors.images = 'An image is required when reporting a found item.';
  }
  return errors;
};

export default function ReportItem() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: '', type: 'lost', location: '',
    tags: '', dateOccurred: '',
  });
  const [errors, setErrors] = useState({});
  const [files, setFiles] = useState([]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateForm(form, files);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      toast.error('Please fix the highlighted fields');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val) formData.append(key, val);
      });
      formData.append('language', i18n.language);
      files.forEach((f) => formData.append('images', f));

      const res = await itemsApi.create(formData);
      const { item, matches, matchMethod } = res.data || {};
      if (form.type === 'lost' && item) {
        navigate(`/report/${item._id}/result`, { state: { matches: matches || [], matchMethod } });
      } else {
        toast.success('Item reported successfully!');
        navigate('/dashboard');
      }
    } catch (err) {
      const serverErrors = err.serverErrors;
      if (serverErrors && serverErrors.length > 0) {
        const mapped = {};
        for (const se of serverErrors) {
          mapped[se.field] = se.message;
        }
        setErrors((prev) => ({ ...prev, ...mapped }));
      }
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `input-field ${errors[field] ? 'border-red-500 focus:ring-red-500' : ''}`;

  return (
    <div className="page-container max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {form.type === 'lost' ? 'Report Lost Item' : 'Report Found Item'}
      </h1>

      <div className="card">
        <div className="flex gap-2 mb-6">
          <button onClick={() => { setForm({ ...form, type: 'lost' }); if (errors.type) setErrors({ ...errors, type: '' }); }}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${form.type === 'lost' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            I Lost Something
          </button>
          <button onClick={() => { setForm({ ...form, type: 'found' }); if (errors.type) setErrors({ ...errors, type: '' }); }}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${form.type === 'found' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            I Found Something
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setField('title', e.target.value)}
              className={inputClass('title')} placeholder="e.g., Black HP Laptop" />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
            <textarea value={form.description} onChange={(e) => setField('description', e.target.value)}
              className={inputClass('description')} rows={4} placeholder="Describe the item in detail..." />
            {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
              <select value={form.category} onChange={(e) => setField('category', e.target.value)}
                className={inputClass('category')}>
                <option value="">Select...</option>
                <option value="electronics">Electronics</option>
                <option value="documents">Documents</option>
                <option value="clothing">Clothing</option>
                <option value="accessories">Accessories</option>
                <option value="books">Books</option>
                <option value="other">Other</option>
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Location *</label>
              <input type="text" value={form.location} onChange={(e) => setField('location', e.target.value)}
                className={inputClass('location')} placeholder="e.g., Library, 2nd Floor" />
              {errors.location && <p className="mt-1 text-sm text-red-500">{errors.location}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
              <input type="date" value={form.dateOccurred} onChange={(e) => setForm({ ...form, dateOccurred: e.target.value })}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
              <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="input-field" placeholder="comma, separated" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Images {form.type === 'found' && <span className="text-red-500">*</span>}
            </label>
            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
              errors.images ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-primary-400'
            }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); setFiles([...files, ...Array.from(e.dataTransfer.files)]); if (errors.images) setErrors({ ...errors, images: '' }); }}>
              <FiUpload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Drag & drop images here, or <span className="text-primary-600 font-medium">browse</span></p>
              <input type="file" multiple accept="image/*" className="hidden"
                onChange={(e) => { setFiles([...files, ...Array.from(e.target.files)]); if (errors.images) setErrors({ ...errors, images: '' }); }} id="file-upload" />
              <button type="button" onClick={() => document.getElementById('file-upload').click()}
                className="mt-3 text-sm text-primary-600 font-medium">Choose Files</button>
            </div>
            {errors.images && <p className="mt-1 text-sm text-red-500">{errors.images}</p>}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {Array.from(files).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
                    {f.name}
                    <button type="button" onClick={() => { const updated = files.filter((_, idx) => idx !== i); setFiles(updated); if (form.type === 'found' && updated.length === 0) setErrors({ ...errors, images: 'An image is required when reporting a found item.' }); }}>
                      <FiX className="w-4 h-4 text-gray-500 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Submitting...' : `Report ${form.type === 'lost' ? 'Lost' : 'Found'} Item`}
          </button>
        </form>
      </div>
    </div>
  );
}
