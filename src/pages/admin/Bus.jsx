import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, query, where, setDoc } from 'firebase/firestore';
import { Search, Bus, Save, Navigation, QrCode, X, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const AdminBus = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // QR Scanner State
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // Student Bus Assignment Form
  const [form, setForm] = useState({
    assigned: false,
    busNumber: '',
    routeName: '',
    pickupLocation: '',
    stops: [],
    destinationName: '',
    feeAmount: 5000,
    feeStatus: 'unpaid'
  });

  // Global Bus Tracker Control (Status Only)
  const [busTracker, setBusTracker] = useState({
    busNumber: 'BUS-01',
    status: 'In Transit',
    speed: 45
  });
  const [trackingSaving, setTrackingSaving] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'student'));
        const snap = await getDocs(q);
        const list = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setStudents(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    const b = student.bus || {};
    setForm({
      assigned: b.assigned || false,
      busNumber: b.busNumber || '',
      routeName: b.routeName || '',
      pickupLocation: b.pickupLocation || '',
      stops: b.stops || [],
      destinationName: b.destinationName || '',
      feeAmount: b.feeAmount || 5000,
      feeStatus: b.feeStatus || 'unpaid'
    });
  };

  const handleAddStop = () => {
    setForm(prev => ({ ...prev, stops: [...prev.stops, { name: '' }] }));
  };

  const handleStopChange = (index, value) => {
    const newStops = [...form.stops];
    newStops[index].name = value;
    setForm({ ...form, stops: newStops });
  };

  const handleRemoveStop = (index) => {
    const newStops = [...form.stops];
    newStops.splice(index, 1);
    setForm({ ...form, stops: newStops });
  };

  const handleSaveStudentBus = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSaving(true);

    try {
      const updatedBus = { 
        assigned: form.assigned,
        busNumber: form.busNumber,
        routeName: form.routeName,
        pickupLocation: form.pickupLocation,
        stops: form.stops.filter(s => s.name.trim() !== ''),
        destinationName: form.destinationName,
        feeAmount: Number(form.feeAmount), 
        feeStatus: form.feeStatus 
      };

      await updateDoc(doc(db, 'users', selectedStudent.id), { bus: updatedBus });

      const updatedStudent = { ...selectedStudent, bus: updatedBus };
      setSelectedStudent(updatedStudent);
      setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
      alert("Bus assignment updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update assignment");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTracker = async (e) => {
    e.preventDefault();
    if (!busTracker.busNumber) return;
    setTrackingSaving(true);

    try {
      const busRef = doc(db, 'buses', busTracker.busNumber);
      await setDoc(busRef, {
        busNumber: busTracker.busNumber,
        status: busTracker.status,
        speed: Number(busTracker.speed),
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      alert(`Status updated for ${busTracker.busNumber}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    } finally {
      setTrackingSaving(false);
    }
  };

  // QR Scanner Logic
  useEffect(() => {
    let html5QrcodeScanner = null;
    
    if (showQRScanner) {
      html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: {width: 250, height: 250} },
        false
      );

      html5QrcodeScanner.render(async (decodedText) => {
        html5QrcodeScanner.clear();
        const student = students.find(s => s.uid === decodedText || s.studentId === decodedText);
        
        if (!student) {
          setScanResult({ success: false, message: "Student not found in database." });
          return;
        }

        if (!student.bus?.assigned) {
          setScanResult({ success: false, message: `${student.name} is not assigned to any bus.` });
          return;
        }

        try {
          const scanRef = collection(db, 'busScans');
          await setDoc(doc(scanRef), {
            studentId: student.studentId,
            studentUid: student.id,
            studentName: student.name,
            busId: student.bus.busNumber,
            pickupLocation: student.bus.pickupLocation,
            scannedAt: new Date().toISOString(),
            status: 'boarded'
          });

          setScanResult({ 
            success: true, 
            message: `Successfully boarded ${student.name} onto ${student.bus.busNumber}` 
          });
        } catch (err) {
          console.error(err);
          setScanResult({ success: false, message: "Failed to save scan record." });
        }
      }, (err) => {
        // Ignore scan errors
      });
    }

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(e => console.error(e));
      }
    };
  }, [showQRScanner, students]);

  const closeScanner = () => {
    setShowQRScanner(false);
    setScanResult(null);
  };

  if (loading) return <div className="loader mx-auto mt-10"></div>;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in grid md:grid-cols-3 gap-6">
      
      {/* Sidebar: Student List */}
      <div className="card md:col-span-1 h-[calc(100vh-120px)] flex flex-col">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Bus className="text-primary" /> Select Student
        </h3>
        <div className="relative mb-4">
          <input 
            type="text" 
            placeholder="Search student..." 
            className="input pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        </div>
        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {filteredStudents.map(student => (
            <div 
              key={student.id} 
              onClick={() => handleSelectStudent(student)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedStudent?.id === student.id ? 'bg-primary-light border-primary' : 'bg-gray-50 border-gray-200 hover:border-primary'}`}
            >
              <div className="font-bold text-gray-900">{student.name}</div>
              <div className="text-sm flex justify-between">
                <span className="text-gray-500">{student.studentId}</span>
                <span className={`font-semibold ${student.bus?.assigned ? 'text-primary' : 'text-gray-400'}`}>
                  {student.bus?.assigned ? student.bus.busNumber : 'Unassigned'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 space-y-6 overflow-y-auto h-[calc(100vh-120px)] pr-2">
        
        {/* Main Panel: Student Assignment Editor */}
        <div className="card">
          {!selectedStudent ? (
            <div className="py-10 flex flex-col items-center justify-center text-gray-400 text-center">
              <Bus size={48} className="mb-4 text-gray-300" />
              <p>Select a student to manage their bus assignment.</p>
            </div>
          ) : (
            <form onSubmit={handleSaveStudentBus}>
              <div className="border-b pb-4 mb-6">
                <h2 className="text-xl font-bold">{selectedStudent.name}</h2>
                <p className="text-gray-500">{selectedStudent.studentId} • Bus Assignment</p>
              </div>

              <div className="space-y-4">
                <div className="form-group flex items-center gap-2 mb-6">
                  <input type="checkbox" id="assigned" className="w-4 h-4 text-primary" checked={form.assigned} onChange={e => setForm({...form, assigned: e.target.checked})} />
                  <label htmlFor="assigned" className="font-bold mb-0 cursor-pointer text-gray-800">Assign Bus to Student</label>
                </div>

                {form.assigned && (
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="col-span-2 font-bold text-gray-700 mb-2">Basic Info</h4>
                      <div className="form-group">
                        <label className="form-label">Bus Number / ID</label>
                        <input type="text" className="input bg-white" placeholder="e.g. BUS-01" value={form.busNumber} onChange={e => setForm({...form, busNumber: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Route Name</label>
                        <input type="text" className="input bg-white" placeholder="e.g. Route A" value={form.routeName} onChange={e => setForm({...form, routeName: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Fee Amount (₹)</label>
                        <input type="number" className="input bg-white" min="0" value={form.feeAmount} onChange={e => setForm({...form, feeAmount: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Fee Status</label>
                        <select className="input bg-white" value={form.feeStatus} onChange={e => setForm({...form, feeStatus: e.target.value})}>
                          <option value="unpaid">Unpaid</option>
                          <option value="paid">Paid</option>
                        </select>
                      </div>
                    </div>

                    {/* Routing Details (Names Only) */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="font-bold text-gray-700 mb-4">Routing Details</h4>
                      
                      <div className="space-y-4">
                        <div className="form-group">
                          <label className="form-label">Pickup Location Name</label>
                          <input type="text" className="input bg-white" placeholder="e.g. Anantapur City Center" value={form.pickupLocation} onChange={e => setForm({...form, pickupLocation: e.target.value})} required />
                        </div>
                        
                        <div className="border-t border-b border-gray-200 py-4 my-2">
                          <div className="flex justify-between items-center mb-3">
                            <label className="form-label mb-0">Intermediate Stops (Optional)</label>
                            <button type="button" onClick={handleAddStop} className="btn btn-outline py-1 px-3 text-sm flex items-center gap-1">
                              <Plus size={14} /> Add Stop
                            </button>
                          </div>
                          
                          {form.stops.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No intermediate stops configured.</p>
                          ) : (
                            <div className="space-y-2">
                              {form.stops.map((stop, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                  <div className="bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</div>
                                  <input 
                                    type="text" 
                                    className="input bg-white py-1.5" 
                                    placeholder="Stop Name" 
                                    value={stop.name} 
                                    onChange={e => handleStopChange(idx, e.target.value)} 
                                    required 
                                  />
                                  <button type="button" onClick={() => handleRemoveStop(idx)} className="text-danger p-2 hover:bg-danger-bg rounded">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Final Destination Name</label>
                          <input type="text" className="input bg-white" placeholder="e.g. Ananthalakshmi Institute" value={form.destinationName} onChange={e => setForm({...form, destinationName: e.target.value})} required />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-6 mt-6 border-t">
                <button type="submit" className="btn btn-primary flex items-center gap-2 px-6" disabled={saving}>
                  <Save size={18} /> {saving ? 'Saving...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Global Tracker Control */}
        <div className="card border-primary border">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
                <Navigation /> Bus Status Manager
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Push live status updates to Firestore `buses/{'{busId}'}`.
              </p>
            </div>
            <button 
              onClick={() => setShowQRScanner(true)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <QrCode size={18} /> Scan Student QR
            </button>
          </div>

          <form onSubmit={handleUpdateTracker}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="form-group col-span-2">
                <label className="form-label">Target Bus ID</label>
                <input type="text" className="input" placeholder="e.g. BUS-01" value={busTracker.busNumber} onChange={e => setBusTracker({...busTracker, busNumber: e.target.value})} required />
              </div>
              <div className="form-group col-span-2">
                <label className="form-label">Status Message</label>
                <input type="text" className="input" placeholder="e.g. On Route, Arrived, Offline" value={busTracker.status} onChange={e => setBusTracker({...busTracker, status: e.target.value})} required />
              </div>
              <div className="form-group col-span-2">
                <label className="form-label">Speed (km/h)</label>
                <input type="number" className="input" value={busTracker.speed} onChange={e => setBusTracker({...busTracker, speed: e.target.value})} required />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary bg-primary-dark" disabled={trackingSaving}>
                {trackingSaving ? 'Broadcasting...' : 'Broadcast Status Update'}
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <QrCode size={20} /> Scan Boarding Pass
              </h3>
              <button onClick={closeScanner} className="text-gray-500 hover:text-gray-800">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4 bg-gray-50">
              {!scanResult ? (
                <>
                  <div id="reader" className="w-full bg-black rounded overflow-hidden"></div>
                  <p className="text-center text-sm text-gray-500 mt-4">Point your camera at the student's ID card QR code.</p>
                </>
              ) : (
                <div className="py-8 text-center flex flex-col items-center">
                  {scanResult.success ? (
                    <CheckCircle size={64} className="text-success mb-4" />
                  ) : (
                    <X size={64} className="text-danger mb-4" />
                  )}
                  <h4 className={`text-xl font-bold mb-2 ${scanResult.success ? 'text-success' : 'text-danger'}`}>
                    {scanResult.success ? 'Boarding Confirmed' : 'Scan Failed'}
                  </h4>
                  <p className="text-gray-600 mb-6">{scanResult.message}</p>
                  
                  <button 
                    onClick={() => setScanResult(null)}
                    className="btn btn-primary"
                  >
                    Scan Next Student
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminBus;
