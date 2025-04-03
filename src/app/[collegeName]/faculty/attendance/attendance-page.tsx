"use client";
import { FormEvent, useEffect, useState } from 'react';
import AttendanceSkeleton from './attendanceSkeleton';
import facultyProtectRoute from '@/app/(components)/utils/protect-route/FacultyProtectRoute';
import { toast, ToastContainer } from 'react-toastify';
import { useRouter } from "next/navigation";
import { useCollege } from '@/context/college-name-provider/CollegeNameProvider';
import { getAllAttendenceAction } from '@/actions';

interface Faculty {
  faculty_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: string;
  highest_education: string;
  address: string;
  email: string;
  contact_no?: string;
  username: string;
  department_id: string;
}

interface Subject {
  subject_id: string;
  subject_name: string;
  required_hours: number;
  habe_practicals: boolean;
  faculty_id: string;
  semester: string;
}

interface Student {
  student_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  prn_no: string;
  email: string;
  username: string;
  department_id: string;
  current_studing_year: string;
  current_studing_semester: string;
}

interface SemesterSubjects {
  semester: string;
  subjects: Subject[];
}

interface AttendanceRecord {
  student_id: string;
  prn_no: string;
  name: string;
  isPresent: boolean;
  date: string;
  startTime: string;
  endTime: string;
}

interface AggregatedAttendanceRecord {
  student_id: string;
  prn_no: string;
  name: string;
  total_lectures: number;
  attended_lectures: number;
  attendance_percentage: number;
}

const AttendancePage: React.FC = () => {
  const { collegeName } = useCollege();
  const router = useRouter();
  const [faculty, setFaculty] = useState<Faculty>({
    faculty_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    highest_education: '',
    address: '',
    email: '',
    contact_no: '',
    username: '',
    department_id: '',
  });

  const [semesters, setSemesters] = useState<SemesterSubjects[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [viewMode, setViewMode] = useState<'update' | 'view'>('update');
  const [filterType, setFilterType] = useState<'overall' | 'specificDate' | 'dateRange'>('overall');
  const [specificDate, setSpecificDate] = useState('');
  const [startDateRange, setStartDateRange] = useState('');
  const [endDateRange, setEndDateRange] = useState('');
  const [aggregatedRecords, setAggregatedRecords] = useState<AggregatedAttendanceRecord[]>([]);

  const getAllSemesterAndSubjects = async () => {
    try {
      const response = await fetch(`/api/faculty/${faculty.faculty_id}/get-all-sem-and-subjects`);
      const res = await response.json();
      setSemesters(res.groupedResponse);
    } catch (error) {
      console.error('Failed to fetch semesters and subjects:', error);
    }
  };

  const getAllStudentsOfSelectedSubject = async (subjectId: string) => {
    try {
      const response = await fetch(`/api/subject/${subjectId}/get-all-students-of-this-subject`);
      const studentsOfSubjects = await response.json();
      setStudents(studentsOfSubjects);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const getAttendanceRecords = async (subjectId: string, filterType: 'overall' | 'specificDate' | 'dateRange', specificDate?: string, startDateRange?: string, endDateRange?: string) => {
    try {
      console.warn("refresh btn hit")
      const response = await fetch(`/api/subject/${subjectId}/get-attendance-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectId,
          semester: selectedSemester
        }),
      });
      const records = await response.json();
      console.warn("data in records : ", records)
      setAggregatedRecords(records);
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
    }
  };

  useEffect(() => {
    const storedFaculty = sessionStorage.getItem('facultySession');
    if (storedFaculty) {
      const parsedFaculty = JSON.parse(storedFaculty);
      setFaculty(parsedFaculty);
    }
    getAllSemesterAndSubjects();
  }, [faculty.faculty_id]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <AttendanceSkeleton />;
  }

  const handleSemesterChange = (e: FormEvent<HTMLSelectElement>) => {
    const target = e.target as HTMLSelectElement;
    setSelectedSemester(target.value);
    setSelectedSubjectId('');
  };

  const handleSubjectChange = async (e: FormEvent<HTMLSelectElement>) => {
    const target = e.target as HTMLSelectElement;
    const subjectId = target.value;
    setSelectedSubjectId(subjectId);

    if (subjectId) {
      await getAllStudentsOfSelectedSubject(subjectId);
      if (viewMode === 'view') {
        await getAttendanceRecords(subjectId, filterType, specificDate, startDateRange, endDateRange);
      }
    }
  };

  const handleUpdateAttendance = async () => {
    const attendanceData = {
      semester: selectedSemester,
      subject: selectedSubjectId,
      startTime: startTime,
      endTime: endTime,
      date: date,
      faculty_id: faculty.faculty_id,
      students: students.map((student) => ({
        student_id: student.student_id,
        prn_no: student.prn_no,
        name: `${student.first_name} ${student.last_name}`,
        isPresent: (document.getElementById(`checkbox-${student.student_id}`) as HTMLInputElement)?.checked || false,
      })),
    };

    try {
      const toastId = toast.loading("Updating attendance ...");
      const response = await fetch(`/api/faculty/${faculty.faculty_id}/update-attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceData),
      });

      toast.dismiss(toastId);
      if (response.ok) {
        toast.success("Attendance updated successfully.");
        router.push(`/${collegeName}/faculty`);
        router.refresh();
      } else {
        toast.error("Oops.. Failed to update attendance.. \n Try again!");
      }
    } catch (error) {
      toast.error("Internal Server Error.. Try again");
      console.error('Error updating attendance:', error);
    }
  };

  const handleViewAttendance = async () => {
    if (selectedSubjectId) {
      await getAttendanceRecords(selectedSubjectId, filterType, specificDate, startDateRange, endDateRange);
    }
  };

  const gettAllAttendence = async () => {
    try {
      const data = await getAllAttendenceAction(selectedSubjectId);

      if (!data.success || !data.data) {
        console.log(data);
        return;
      }

      // Transform data to match AttendanceRecord[]
      const formattedData: AttendanceRecord[] = data.data.map((record) => ({
        student_id: record.student_id,
        prn_no: record.id.toString(),  // Assuming 'id' is bigint, convert it to string
        name: "", // Replace with actual field if available
        isPresent: record.status,
        date: record.date ? record.date.toISOString().split("T")[0] : "",
        startTime: record.lecture_start_time.toISOString(),
        endTime: record.lecture_end_time.toISOString(),
      }));

      setAttendanceRecords(formattedData);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };


  const handleViewAttendence = () => {
    setViewMode('view')
    gettAllAttendence();
  }
  const handleDownloadAttendance = () => {
    // Implement download functionality
    console.log('Downloading aggregated attendance...');
  };

  const readableDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata", // Change this to your preferred timezone
    });
  };

  const filteredSubjects = selectedSemester
    ? semesters.find((sem) => sem.semester === selectedSemester)?.subjects || []
    : [];

  return (
    <div className="space-y-6 py-16 px-10 lg:pl-28 mt-6 sm:pl-24 bg-white h-screen">
      {/* Faculty Information */}
      <div className="w-full lg:w-2/3 bg-gray-200 p-6 rounded-lg shadow-lg flex flex-col md:flex-row items-center justify-center mx-auto mt-2">
        <img src="/images/testimonials/author-02.png" alt="Faculty Photo" className="w-40 h-40 rounded-full shadow-md" />
        <div className="mt-6 md:mt-0 md:ml-8 text-black text-center md:text-left">
          <h2 className="text-2xl font-semibold mb-2 text-blue-700">
            {faculty.first_name} {faculty.last_name}
          </h2>
          <p className="text-gray-700 mb-1">Faculty ID: <span className="font-medium">{faculty.faculty_id}</span></p>
          <p className="text-gray-700 mb-1">Designation: <span className="font-medium">Professor</span></p>
          <p className="text-gray-700 mb-1">Email: <a href={`mailto:${faculty.email}`} className="text-blue-500 hover:underline">{faculty.email}</a></p>
          <p className="text-gray-700">Contact No: <span className="font-medium">{faculty.contact_no}</span></p>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => setViewMode('update')}
          className={`px-4 py-2 rounded-md flex items-center ${viewMode === 'update' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'
            }`}
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
          Update Attendance
        </button>
        <button
          onClick={handleViewAttendence}
          className={`px-4 py-2 rounded-md flex items-center ${viewMode === 'view' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'
            }`}
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
          View Attendance
        </button>
      </div>

      {/* Dropdowns and Inputs */}
      <div className="w-full grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Semester Dropdown */}
        <div>
          <label className="block mb-2">Select Semester</label>
          <select
            className="w-full p-2 border rounded-md"
            value={selectedSemester}
            onChange={handleSemesterChange}
          >
            <option value="">Select Semester</option>
            {semesters.map((semester) => (
              <option key={semester.semester} value={semester.semester}>
                Semester {semester.semester}
              </option>
            ))}
          </select>
        </div>

        {/* Subject Dropdown */}
        <div>
          <label className="block mb-2">Select Subject</label>
          <select
            className="w-full p-2 border rounded-md"
            value={selectedSubjectId}
            onChange={handleSubjectChange}
            disabled={!selectedSemester}
          >
            <option value="">Select Subject</option>
            {filteredSubjects.map((subject) => (
              <option key={subject.subject_id} value={subject.subject_id}>
                {subject.subject_name}
              </option>
            ))}
          </select>
        </div>

        {/* Conditional Rendering based on View Mode */}
        {viewMode === 'update' ? (
          <>
            {/* Start Time */}
            <div>
              <label className="block mb-2">Start Time</label>
              <input
                type="time"
                className="w-full p-2 border rounded-md"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={!selectedSubjectId}
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block mb-2">End Time</label>
              <input
                type="time"
                className="w-full p-2 border rounded-md"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!selectedSubjectId}
              />
            </div>

            {/* Date */}
            <div>
              <label className="block mb-2">Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded-md"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!selectedSubjectId}
              />
            </div>
          </>
        ) : (
          <>
            {/* Filter Type Dropdown */}
            <div>
              <label className="block mb-2">Filter Type</label>
              <select
                className="w-full p-2 border rounded-md"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'overall' | 'specificDate' | 'dateRange')}
              >
                <option value="overall">Overall Attendance</option>
                <option value="specificDate">Specific Date</option>
                <option value="dateRange">Date Range</option>
              </select>
            </div>

            {/* Specific Date Input */}
            {filterType === 'specificDate' && (
              <div>
                <label className="block mb-2">Specific Date</label>
                <input
                  type="date"
                  className="w-full p-2 border rounded-md"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                />
              </div>
            )}

            {/* Date Range Inputs */}
            {filterType === 'dateRange' && (
              <>
                <div>
                  <label className="block mb-2">Start Date</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-md"
                    value={startDateRange}
                    onChange={(e) => setStartDateRange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-2">End Date</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-md"
                    value={endDateRange}
                    onChange={(e) => setEndDateRange(e.target.value)}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Conditional Rendering based on View Mode */}
      {viewMode === 'update' ? (
        <>
          {/* Student Attendance Table */}
          <div className="w-full overflow-x-auto mt-6">
            <h3 className="text-lg font-semibold mb-4">Students Attendance</h3>
            <table className="min-w-full bg-white border">
              <thead>
                <tr className="bg-gray-200 text-black">
                  <th className="p-4 border">PRN No</th>
                  <th className="p-4 border">Student Id</th>
                  <th className="p-4 border">Student Name</th>
                  <th className="p-4 border">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={index} className="text-center text-black">
                    <td className="p-4 border">{student.prn_no}</td>
                    <td className="p-4 border">{student.student_id}</td>
                    <td className="p-4 border">{`${student.first_name} ${student.last_name}`}</td>
                    <td className="p-4 border">
                      <input
                        type="checkbox"
                        id={`checkbox-${student.student_id}`}
                        className='w-6 h-6'
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Update Attendance Button */}
          <div className="mt-6">
            <button
              onClick={handleUpdateAttendance}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-500 disabled:opacity-50 flex items-center"
              disabled={!selectedSubjectId || !date || !startTime || !endTime}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Update Attendance
            </button>
          </div>
        </>
      ) : (
        <>
          {/* View Attendance Table */}
          <div className="w-full overflow-x-auto mt-6">
            <h3 className="text-lg font-semibold mb-4">Attendance Records</h3>
            <table className="min-w-full bg-white border">
              <thead>
                <tr className="bg-gray-200 text-black">
                  <th className="p-4 border">PRN No</th>
                  <th className="p-4 border">Student Name</th>
                  <th className="p-4 border">Date</th>
                  <th className="p-4 border">Start Time</th>
                  <th className="p-4 border">End Time</th>
                  <th className="p-4 border">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record, index) => (
                  <tr key={index} className="text-center text-black">
                    <td className="p-4 border">{record.prn_no}</td>
                    <td className="p-4 border">{record.name}</td>
                    <td className="p-4 border">{record.date}</td>
                    <td className="p-4 border">{record.date}</td>
                    <td className="p-4 border">{readableDate(record.endTime)}</td>
                    <td className="p-4 border">{record.isPresent ? 'Present' : 'Absent'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* View Attendance Button */}
          <div className="mt-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Attendance Records</h3>
              <div className="flex gap-4">
                <button
                  onClick={handleViewAttendance}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-500 disabled:opacity-50 flex items-center"
                  disabled={!selectedSubjectId}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
                <button
                  onClick={handleDownloadAttendance}
                  className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-500 disabled:opacity-50 flex items-center"
                  disabled={!selectedSubjectId}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="w-full overflow-x-auto mt-4">
              <table className="min-w-full bg-white border">
                <thead>
                  <tr className="bg-gray-200 text-black">
                    {filterType === 'overall' ? (
                      <>
                        <th className="p-4 border">PRN No</th>
                        <th className="p-4 border">Student Name</th>
                        <th className="p-4 border">Total Lectures</th>
                        <th className="p-4 border">Attended</th>
                        <th className="p-4 border">Attendance %</th>
                      </>
                    ) : (
                      <>
                        <th className="p-4 border">PRN No</th>
                        <th className="p-4 border">Student Name</th>
                        <th className="p-4 border">Date</th>
                        <th className="p-4 border">Start Time</th>
                        <th className="p-4 border">End Time</th>
                        <th className="p-4 border">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filterType === 'overall' ? (
                    aggregatedRecords.map((summary) => (
                      <tr key={summary.prn_no} className="text-center text-black">
                        <td className="p-4 border">{summary.prn_no}</td>
                        <td className="p-4 border">{summary.name}</td>
                        <td className="p-4 border">{summary.total_lectures}</td>
                        <td className="p-4 border">{summary.attended_lectures}</td>
                        <td className="p-4 border">{summary.attendance_percentage.toFixed(2)}%</td>
                      </tr>
                    ))
                  ) : (
                    attendanceRecords.map((record) => (
                      <tr key={record.student_id} className="text-center text-black">
                        <td className="p-4 border">{record.prn_no}</td>
                        <td className="p-4 border">{record.name}</td>
                        <td className="p-4 border">{new Date(record.date).toLocaleDateString()}</td>
                        <td className="p-4 border">{record.startTime}</td>
                        <td className="p-4 border">{record.endTime}</td>
                        <td className="p-4 border">
                          <span
                            className={`px-2 py-1 rounded-full ${record.isPresent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                          >
                            {record.isPresent ? 'Present' : 'Absent'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>


              </table>
            </div>
          </div>




        </>
      )}
    </div>
  );
};

export default facultyProtectRoute(AttendancePage);