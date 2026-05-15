import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { items as itemsApi } from '../../services/api';
import toast from 'react-hot-toast';
import { FiUpload, FiX } from 'react-icons/fi';

export default function ReportItem() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: '', type: 'lost', location: '',
    tags: '', dateOccurred: '',
  });
  const [files, setFiles] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val) formData.append(key, key === 'tags' ? val.split(',').map(t => t.trim()) : val);
      });
      files.forEach((f) => formData.append('images', f));

      await itemsApi.create(formData);
      toast.success('Item reported successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {form.type === 'lost' ? 'Report Lost Item' : 'Report Found Item'}
      </h1>

      <div className="card">
        <div className="flex gap-2 mb-6">
          <button onClick={() => setForm({ ...form, type: 'lost' })}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${form.type === 'lost' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            I Lost Something
          </button>
          <button onClick={() => setForm({ ...form, type: 'found' })}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${form.type === 'found' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            I Found Something
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field" placeholder="e.g., Black HP Laptop" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field" rows={4} placeholder="Describe the item in detail..." required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input-field" required>
                <option value="">Select...</option>
                <option value="electronics">Electronics</option>
                <option value="documents">Documents</option>
                <option value="clothing">Clothing</option>
                <option value="accessories">Accessories</option>
                <option value="books">Books</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Location *</label>
              <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="input-field" placeholder="e.g., Library, 2nd Floor" required />
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Images</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 transition cursor-pointer"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); setFiles([...files, ...Array.from(e.dataTransfer.files)]); }}>
              <FiUpload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Drag & drop images here, or <span className="text-primary-600 font-medium">browse</span></p>
              <input type="file" multiple accept="image/*" className="hidden"
                onChange={(e) => setFiles([...files, ...Array.from(e.target.files)])} id="file-upload" />
              <button type="button" onClick={() => document.getElementById('file-upload').click()}
                className="mt-3 text-sm text-primary-600 font-medium">Choose Files</button>
            </div>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {Array.from(files).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
                    {f.name}
                    <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>
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
