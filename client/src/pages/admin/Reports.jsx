import { useState, useEffect, useRef } from 'react';
import { admin as adminApi } from '../../services/api';
import { FiPieChart, FiBarChart2, FiDownload, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

export default function Reports() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getReports();
      setReports(res.data?.reports || {});
    } catch (error) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    const element = reportRef.current;
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.setFontSize(18);
    pdf.text('LostLink Analytics Report', 15, 15);
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 15, 22);
    
    pdf.addImage(imgData, 'PNG', 10, 30, pdfWidth - 20, pdfHeight);
    pdf.save(`lostlink-report-${Date.now()}.pdf`);
    toast.success('PDF exported successfully');
  };

  const exportCSV = () => {
    if (!reports) return;
    let csvContent = "Category,Label,Count\n";
    
    reports.usersByRole?.forEach(row => csvContent += `Users,${row._id},${row.count}\n`);
    reports.itemsByType?.forEach(row => csvContent += `Items,${row._id},${row.count}\n`);
    reports.claimsByStatus?.forEach(row => csvContent += `Claims,${row._id},${row.count}\n`);
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lostlink-report-${Date.now()}.csv`;
    link.click();
    toast.success('CSV exported successfully');
  };

  if (loading) return (
    <div className="page-container flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
    </div>
  );

  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

  return (
    <div className="page-container">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FiBarChart2 className="text-primary-500" /> Analytics & Reports
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Detailed system performance and distribution metrics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
            <FiDownload /> Export CSV
          </button>
          <button onClick={exportPDF} className="btn-primary flex items-center gap-2">
            <FiFileText /> Export PDF
          </button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-8 pb-10">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* User Distribution */}
          <div className="card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <FiPieChart className="text-blue-500" /> Users by Role
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reports?.usersByRole || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="_id"
                    label
                  >
                    {reports?.usersByRole?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Item Status */}
          <div className="card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <FiBarChart2 className="text-purple-500" /> Items by Category
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reports?.itemsByType || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Claims Trends */}
          <div className="card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <FiPieChart className="text-orange-500" /> Claims by Status
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reports?.claimsByStatus || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="count"
                    nameKey="_id"
                    label
                  >
                    {reports?.claimsByStatus?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Device Distribution */}
          <div className="card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <FiBarChart2 className="text-green-500" /> Security Personnel Distribution
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reports?.devicesByType || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
