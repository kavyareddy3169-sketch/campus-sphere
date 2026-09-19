import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Users, Bus, BookOpen, CreditCard, Clock } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeBuses: 0,
    totalBooks: 0, // Mocked total inventory
    issuedBooks: 0,
    feeCollected: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
        
        let totalFee = 0;
        let issuedBooks = 0;
        let activeBuses = 0;
        
        usersSnap.forEach(doc => {
          const data = doc.data();
          
          if (data.examFee?.status === 'paid') totalFee += Number(data.examFee.amount || 0);
          if (data.bus?.feeStatus === 'paid') totalFee += Number(data.bus.feeAmount || 0);
          if (data.library?.subscriptionStatus === 'active') totalFee += 1200; // Library standard fee

          if (data.bus?.assigned) activeBuses++;
          issuedBooks += Number(data.library?.booksBorrowed || 0);
        });

        setStats({
          totalStudents: usersSnap.size,
          activeBuses: activeBuses,
          totalBooks: 5000, // Static catalog size
          issuedBooks: issuedBooks,
          feeCollected: totalFee
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="loader mx-auto mt-10"></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Admin Overview</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Students</p>
              <h3 className="text-3xl font-bold mt-1">{stats.totalStudents}</h3>
            </div>
            <div className="p-3 bg-primary-light rounded-lg">
              <Users className="text-primary" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
              <h3 className="text-3xl font-bold mt-1 text-success">₹{stats.feeCollected}</h3>
            </div>
            <div className="p-3 bg-success-bg rounded-lg">
              <CreditCard className="text-success" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Buses</p>
              <h3 className="text-3xl font-bold mt-1">{stats.activeBuses}</h3>
            </div>
            <div className="p-3 bg-warning-bg rounded-lg">
              <Bus className="text-warning" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Library Books</p>
              <h3 className="text-3xl font-bold mt-1">{stats.totalBooks}</h3>
            </div>
            <div className="p-3 bg-secondary rounded-lg bg-opacity-10" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
              <BookOpen className="text-secondary" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm text-gray-500 font-medium">Books Currently Issued</p>
              <h3 className="text-3xl font-bold mt-1">{stats.issuedBooks}</h3>
            </div>
            <div className="p-3 bg-danger-bg rounded-lg">
              <Clock className="text-danger" size={24} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
