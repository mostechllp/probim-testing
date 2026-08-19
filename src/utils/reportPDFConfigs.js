import PDFGenerator from "./pdfGenerator";
import { formatDate, getDaysDifference } from "./reportUtils";

export const generateEmployeeDetailsPDF = (employees, filters = {}) => {
  const pdf = new PDFGenerator();
  pdf.init("landscape");

  const stats = `Total: ${employees.length} | Active: ${employees.filter(e => e.status === "Active").length} | Inactive: ${employees.filter(e => e.status === "Inactive").length}`;
  
  pdf.addHeader("Employee Details Report", "", { ...filters, stats });

  const columns = [
    "S.No", "Emp ID", "Name", "Company", "Department", "Designation",
    "Passport No", "Passport Expiry", "Visa No", "Visa Expiry",
    "Labor No", "Labor Expiry", "EID No", "EID Expiry", "Joining Date",
    "Email", "Phone", "Status"
  ];

  const data = employees.map((emp, index) => [
    index + 1,
    emp.emp_id,
    emp.name,
    emp.company_name,
    emp.department_name,
    emp.designation_name,
    emp.passport_no,
    formatDate(emp.passport_expiry),
    emp.visa_no,
    formatDate(emp.visa_expiry),
    emp.labor_no,
    formatDate(emp.labor_expiry),
    emp.eid_no,
    formatDate(emp.eid_expiry),
    formatDate(emp.joining_date),
    emp.email,
    emp.phone,
    emp.status,
  ]);

  pdf.addTable(columns, data, 55);
  pdf.addFooter();
  pdf.save(`employee_details_${new Date().toISOString().split("T")[0]}.pdf`);
};

export const generateAttendancePDF = (records, filters = {}) => {
  const pdf = new PDFGenerator();
  pdf.init("landscape");

  // Helper function to check if overtime exists (handles both string and number)
  const hasOvertimeValue = (overtime) => {
    if (!overtime || overtime === "-" || overtime === "0" || overtime === 0) return false;
    // If it's a string like "5 mins", "1 hour 32 mins", it has overtime
    if (typeof overtime === 'string' && overtime.trim() !== "") return true;
    // If it's a number greater than 0
    if (typeof overtime === 'number' && overtime > 0) return true;
    return false;
  };

  // Update stats calculation to include overtime
  const totalPresent = records.filter(r => {
    const status = String(r.status || r.attendance_status || "").toLowerCase();
    return status === "present" || status === "full day" || status === "fullday";
  }).length;
  const totalAbsent = records.filter(r => {
    const status = String(r.status || r.attendance_status || "").toLowerCase();
    return status === "absent";
  }).length;
  const totalLate = records.filter(r => {
    const status = String(r.status || r.attendance_status || "").toLowerCase();
    return status === "late";
  }).length;
  const totalHalfDay = records.filter(r => {
    const status = String(r.status || r.attendance_status || "").toLowerCase();
    return status === "half day" || status === "halfday";
  }).length;
  const totalOvertime = records.filter(r => hasOvertimeValue(r.overtime)).length;
  
  const stats = `Total: ${records.length} | Present: ${totalPresent} | Late: ${totalLate} | Half Day: ${totalHalfDay} | Absent: ${totalAbsent} | Overtime: ${totalOvertime}`;
  
  pdf.addHeader("Attendance Report", `Period: ${filters.start_date} to ${filters.end_date}`, { ...filters, stats });

  // Updated columns - added OVERTIME column
  const columns = ["S.No", "Date", "Employee", "Department", "Punch In", "Punch Out", "Worked Hours", "Overtime", "Status"];

  // Helper function to format worked hours (handles both number and string)
  const formatWorkedHours = (hours) => {
    if (!hours || hours === 0 || hours === "0" || hours === "-") return "-";
    
    let numHours;
    if (typeof hours === 'string') {
      // If it's already a formatted string like "9 hrs 5 mins", return as-is
      if (hours.includes('hr') || hours.includes('min') || hours.includes('hour')) {
        return hours;
      }
      numHours = parseFloat(hours);
    } else {
      numHours = hours;
    }
    
    if (isNaN(numHours) || numHours === 0) return "-";
    const h = Math.floor(numHours);
    const m = Math.round((numHours - h) * 60);
    if (h === 0) return `${m} mins`;
    if (m === 0) return `${h} hr${h > 1 ? 's' : ''}`;
    return `${h} hr${h > 1 ? 's' : ''} ${m} min${m > 1 ? 's' : ''}`;
  };

  // Helper function to get status label
  const getStatusLabel = (status) => {
    const statusLower = String(status || "").toLowerCase();
    const statusMap = {
      "present": "Full Day",
      "full day": "Full Day",
      "fullday": "Full Day",
      "absent": "Absent",
      "late": "Late",
      "half day": "Half Day",
      "halfday": "Half Day",
      "holiday": "Holiday",
      "leave": "Leave",
    };
    return statusMap[statusLower] || status || "Unknown";
  };

  // Build the data array
  const data = records.map((record, index) => {
    const status = record.status || record.attendance_status || "Present";
    const hasOvertime = hasOvertimeValue(record.overtime);
    
    // Get the overtime display value (as-is from API)
    const overtimeDisplay = hasOvertime ? record.overtime : "-";
    
    // Format worked hours - if it's already formatted, keep it
    let workedHoursDisplay = record.worked_hours || record.working_hours;
    if (workedHoursDisplay && typeof workedHoursDisplay === 'number') {
      workedHoursDisplay = formatWorkedHours(workedHoursDisplay);
    } else if (workedHoursDisplay && typeof workedHoursDisplay === 'string') {
      // If it's a string that already contains 'hr' or 'min', keep it as-is
      if (workedHoursDisplay.includes('hr') || workedHoursDisplay.includes('min') || workedHoursDisplay.includes('hour')) {
        // Keep as-is
      } else {
        workedHoursDisplay = formatWorkedHours(workedHoursDisplay);
      }
    } else {
      workedHoursDisplay = "-";
    }
    
    return [
      index + 1,
      record.date || "-",
      record.employeeName || record.name || "-",
      record.department || "-",
      record.punchIn || record.punch_in || "-",
      record.punchOut || record.punch_out || (record.punchOut === null ? "Not Punched Out" : "-"),
      workedHoursDisplay,
      overtimeDisplay,
      getStatusLabel(status) + (hasOvertime ? " + OT" : ""),
    ];
  });

  pdf.addTable(columns, data, 55);
  pdf.addFooter();
  pdf.save(`attendance_report_${filters.start_date}_to_${filters.end_date}.pdf`);
};

// src/utils/reportPDFConfigs.js - Add this function

export const generateProjectReportPDF = (projects, filters = {}) => {
  const pdf = new PDFGenerator();
  pdf.init("landscape");

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === "Active").length;
  const totalHours = projects.reduce((sum, p) => sum + p.totalHours, 0);
  const stats = `Total: ${totalProjects} | Active: ${activeProjects} | Total Hours: ${totalHours.toFixed(1)}h`;
  
  pdf.addHeader("Project Report", "", { ...filters, stats });

  const columns = [
    "S.No", "Project ID", "Project Name", "Company", 
    "Total Hours", "Total Employees", "Status"
  ];

  const data = projects.map((project, index) => [
    index + 1,
    project.id,
    project.name,
    project.company_name,
    project.totalHours.toFixed(1) + "h",
    project.totalEmployees,
    project.status,
  ]);

  pdf.addTable(columns, data, 55);
  pdf.addFooter();
  pdf.save(`project_report_${new Date().toISOString().split("T")[0]}.pdf`);
};

export const generateLeavesPDF = (leaves, filters = {}) => {
  const pdf = new PDFGenerator();
  pdf.init("landscape");

  const pending = leaves.filter(l => l.status === "Pending").length;
  const approved = leaves.filter(l => l.status === "Approved").length;
  const rejected = leaves.filter(l => l.status === "Rejected").length;
  const stats = `Total: ${leaves.length} | Pending: ${pending} | Approved: ${approved} | Rejected: ${rejected}`;
  
  pdf.addHeader("Leave Requests Report", "", { ...filters, stats });

  const columns = ["S.No", "Request Date", "Employee", "Leave Type", "From", "To", "Days", "Status"];

  const data = leaves.map((leave, index) => [
    index + 1,
    formatDate(leave.created_at || leave.request_date),
    leave.employee_name || leave.employee?.name || "-",
    leave.leave_type?.name || leave.type,
    formatDate(leave.from_date || leave.fromDate),
    formatDate(leave.to_date || leave.toDate),
    leave.number_of_days || leave.days,
    leave.status,
  ]);

  pdf.addTable(columns, data, 55);
  pdf.addFooter();
  pdf.save(`leave_requests_${new Date().toISOString().split("T")[0]}.pdf`);
};

export const generateEmployeeExpiryPDF = (employees, title, filters = {}) => {
  const pdf = new PDFGenerator();
  pdf.init("landscape");

  const expiring7 = employees.filter(e => e.daysLeft <= 7).length;
  const expiring15 = employees.filter(e => e.daysLeft > 7 && e.daysLeft <= 15).length;
  const expiring30 = employees.filter(e => e.daysLeft > 15 && e.daysLeft <= 30).length;
  const stats = `Total: ${employees.length} | 7 days: ${expiring7} | 15 days: ${expiring15} | 30 days: ${expiring30}`;
  
  pdf.addHeader(title, `Expiry period: ${filters.expiryDays || 30} days`, { ...filters, stats });

  const columns = ["S.No", "Emp ID", "Name", "Company", "Department", "Passport Expiry", "Visa Expiry", "Labor Expiry", "EID Expiry", "Days Left"];

  const data = employees.map((emp, index) => [
    index + 1,
    emp.emp_id,
    emp.name,
    emp.company_name,
    emp.department_name,
    formatDate(emp.passport_expiry),
    formatDate(emp.visa_expiry),
    formatDate(emp.labor_expiry),
    formatDate(emp.eid_expiry),
    emp.daysLeft ? `${emp.daysLeft} days` : "-",
  ]);

  pdf.addTable(columns, data, 55);
  pdf.addFooter();
  pdf.save(`${title.toLowerCase().replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
};

export const generateCompanyExpiryPDF = (companies, title, filters = {}) => {
  const pdf = new PDFGenerator();
  pdf.init("landscape");

  const stats = `Total companies with expiring documents: ${companies.length}`;
  
  pdf.addHeader(title, `Expiry period: ${filters.expiryDays || 30} days`, { ...filters, stats });

  const columns = ["S.No", "Document Name", "Expiry Date", "Days Left"];

  const data = companies.map((company, index) => {
    const expiryDates = [
      company.trade_license_expiry,
      company.establishment_card_expiry,
      company.expiry_date,
    ].filter((date) => date);

    const earliestExpiry = expiryDates.length > 0
      ? expiryDates.reduce((earliest, current) => 
          new Date(current) < new Date(earliest) ? current : earliest
        )
      : null;

    const daysLeft = earliestExpiry ? getDaysDifference(earliestExpiry) : null;

    return [
      index + 1,
      company.name,
      earliestExpiry ? formatDate(earliestExpiry) : "-",
      daysLeft !== null ? (daysLeft < 0 ? `Expired ${Math.abs(daysLeft)} days ago` : `${daysLeft} days`) : "-",
    ];
  });

  pdf.addTable(columns, data, 55);
  pdf.addFooter();
  pdf.save(`${title.toLowerCase().replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
};

export const generateCompanyUpcomingRenewalsPDF = (companies, title, filters = {}) => {
  const pdf = new PDFGenerator();
  pdf.init("landscape");

  const stats = `Total companies with upcoming renewals: ${companies.length} | Period: ${filters.minDays || 31}-${filters.maxDays || 90} days`;
  
  // Create filter summary text
  let filterText = `Renewal period: ${filters.minDays || 31} to ${filters.maxDays || 90} days from today`;
  if (filters.search) {
    filterText += ` | Search: "${filters.search}"`;
  }
  
  pdf.addHeader(title, filterText, { ...filters, stats });

  const columns = [
    "S.No", 
    "Document Name", 
    "Expiry Date",
    "Days Left"
  ];

  const data = companies.map((company, index) => {
    const expiryDates = [
      company.trade_license_expiry,
      company.establishment_card_expiry,
      company.expiry_date,
    ].filter((date) => date);

    const earliestExpiry = expiryDates.length > 0
      ? expiryDates.reduce((earliest, current) => 
          new Date(current) < new Date(earliest) ? current : earliest
        )
      : null;

    const daysLeft = earliestExpiry ? getDaysDifference(earliestExpiry) : null;
    
    return [
      index + 1,
      company.name,
      earliestExpiry ? formatDate(earliestExpiry) : "-",
      daysLeft !== null ? `${daysLeft} days` : "-",
    ];
  });

  pdf.addTable(columns, data, 55);
  pdf.addFooter();
  pdf.save(`${title.toLowerCase().replace(/ /g, "_")}_${filters.minDays || 31}_${filters.maxDays || 90}days_${new Date().toISOString().split("T")[0]}.pdf`);
};

export const generateEmployeeUpcomingRenewalsPDF = (employees, title, filters = {}) => {
  const pdf = new PDFGenerator();
  pdf.init("landscape");

  // Calculate statistics
  const totalEmployees = employees.length;
  const renewing31to45 = employees.filter(emp => {
    const earliest = getEarliestUpcomingExpiryForEmployee(emp, filters.minDays || 31, filters.maxDays || 90);
    return earliest && earliest.days >= 31 && earliest.days <= 45;
  }).length;
  const renewing46to60 = employees.filter(emp => {
    const earliest = getEarliestUpcomingExpiryForEmployee(emp, filters.minDays || 31, filters.maxDays || 90);
    return earliest && earliest.days >= 46 && earliest.days <= 60;
  }).length;
  const renewing61to90 = employees.filter(emp => {
    const earliest = getEarliestUpcomingExpiryForEmployee(emp, filters.minDays || 31, filters.maxDays || 90);
    return earliest && earliest.days >= 61 && earliest.days <= 90;
  }).length;

  const stats = `Total: ${totalEmployees} | 31-45 days: ${renewing31to45} | 46-60 days: ${renewing46to60} | 61-90 days: ${renewing61to90}`;
  
  // Create filter summary text
  let filterText = `Renewal period: ${filters.minDays || 31} to ${filters.maxDays || 90} days from today`;
  if (filters.company && filters.company !== "all") filterText += ` | Company: ${filters.company}`;
  if (filters.department && filters.department !== "all") filterText += ` | Department: ${filters.department}`;
  if (filters.search) filterText += ` | Search: "${filters.search}"`;
  
  pdf.addHeader(title, filterText, { ...filters, stats });

  const columns = [
    "S.No", "Emp ID", "Name", "Company", "Department",
    "Passport Expiry", "Visa Expiry", "Labor Expiry", "EID Expiry", "Days Left (Earliest)"
  ];

  const data = employees.map((emp, index) => {
    // Find earliest upcoming expiry
    const minDays = filters.minDays || 31;
    const maxDays = filters.maxDays || 90;
    
    const expiryItems = [
      { date: emp.passport_expiry, name: "Passport", key: "passport" },
      { date: emp.visa_expiry, name: "Visa", key: "visa" },
      { date: emp.labor_expiry, name: "Labor", key: "labor" },
      { date: emp.eid_expiry, name: "EID", key: "eid" },
    ].map(item => ({
      ...item,
      days: getDaysDifference(item.date)
    })).filter(
      item => item.days !== null && item.days >= minDays && item.days <= maxDays
    );

    const earliest = expiryItems.length > 0 ? 
      expiryItems.reduce((min, item) => item.days < min.days ? item : min, expiryItems[0]) : 
      null;

    // Get the earliest days left display
    let daysLeftDisplay = "-";
    if (earliest) {
      let bgColor = "";
      if (earliest.days >= 31 && earliest.days <= 45) bgColor = "blue";
      else if (earliest.days >= 46 && earliest.days <= 60) bgColor = "cyan";
      // eslint-disable-next-line no-unused-vars
      else if (earliest.days >= 61 && earliest.days <= 90) bgColor = "green";
      daysLeftDisplay = `${earliest.days} days (${earliest.name})`;
    }

    return [
      index + 1,
      emp.emp_id || "-",
      emp.name || "-",
      emp.company_name || "-",
      emp.department_name || "-",
      formatDate(emp.passport_expiry),
      formatDate(emp.visa_expiry),
      formatDate(emp.labor_expiry),
      formatDate(emp.eid_expiry),
      daysLeftDisplay,
    ];
  });

  pdf.addTable(columns, data, 55);
  pdf.addFooter();
  pdf.save(`${title.toLowerCase().replace(/ /g, "_")}_${filters.minDays || 31}_${filters.maxDays || 90}days_${new Date().toISOString().split("T")[0]}.pdf`);
};

// Helper function to get earliest upcoming expiry for an employee
const getEarliestUpcomingExpiryForEmployee = (employee, minDays, maxDays) => {
  const expiryItems = [
    { date: employee.passport_expiry, name: "Passport" },
    { date: employee.visa_expiry, name: "Visa" },
    { date: employee.labor_expiry, name: "Labor" },
    { date: employee.eid_expiry, name: "EID" },
  ].map(item => ({
    ...item,
    days: getDaysDifference(item.date)
  })).filter(
    item => item.days !== null && item.days >= minDays && item.days <= maxDays
  );

  if (expiryItems.length === 0) return null;
  return expiryItems.reduce((min, item) => item.days < min.days ? item : min, expiryItems[0]);
};