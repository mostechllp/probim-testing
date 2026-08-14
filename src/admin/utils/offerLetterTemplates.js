// Template configurations and content generators
export const TEMPLATES = {
  corporate: {
    id: 'corporate',
    name: 'Corporate Classic',
    description: 'Traditional corporate style with formal layout',
    category: 'Professional',
    colors: { primary: '#2c3e50', accent: '#2ecc71', background: '#ffffff' },
    fontFamily: 'Times New Roman, serif',
  },
  modern: {
    id: 'modern',
    name: 'Modern Minimal',
    description: 'Clean, contemporary design with sidebar layout',
    category: 'Contemporary',
    colors: { primary: '#1a1a2e', accent: '#0f3460', background: '#f5f5f5' },
    fontFamily: 'Arial, sans-serif',
  },
  professional: {
    id: 'professional',
    name: 'Professional Blue',
    description: 'Executive style with blue accents',
    category: 'Professional',
    colors: { primary: '#1e3a8a', accent: '#3b82f6', background: '#ffffff' },
    fontFamily: 'Georgia, serif',
  },
  elegant: {
    id: 'elegant',
    name: 'Elegant Gold',
    description: 'Premium design with gold trim',
    category: 'Premium',
    colors: { primary: '#1a1a1a', accent: '#d4af37', background: '#faf9f6' },
    fontFamily: 'Garamond, serif',
  },
  tech: {
    id: 'tech',
    name: 'Tech Startup',
    description: 'Dynamic design for tech companies',
    category: 'Modern',
    colors: { primary: '#0f172a', accent: '#06b6d4', background: '#ffffff' },
    fontFamily: 'Inter, sans-serif',
  },
  minimalist: {
    id: 'minimalist',
    name: 'Clean Minimalist',
    description: 'Simple, clean, and distraction-free',
    category: 'Contemporary',
    colors: { primary: '#333333', accent: '#666666', background: '#ffffff' },
    fontFamily: 'Helvetica, sans-serif',
  },
  traditional: {
    id: 'traditional',
    name: 'Traditional Letter',
    description: 'Classic letter format with old-world charm',
    category: 'Classic',
    colors: { primary: '#4a3728', accent: '#8b7355', background: '#fef9e8' },
    fontFamily: 'Courier New, monospace',
  }
};

// Template content generator functions
export const generateOfferLetterContent = (templateId, employeeData) => {
  let {
    firstName = '',
    lastName = '',
    designation = '[Job Title]',
    joiningDate = '',
    basicSalary = '',
    otherAllowance = '',
    totalMonthlySalary = '',
    paymentCycle = 'Monthly',
    currency = 'AED',
    department = '',
    experience = '',
    nationality = ''
  } = employeeData;

  const fullName = `${firstName} ${lastName}`.trim() || '[Candidate Name]';
  firstName = firstName || 'Candidate';

  // Format date
  let formattedJoiningDate = joiningDate;
  if (joiningDate && joiningDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = joiningDate.split('-');
    formattedJoiningDate = `${day}/${month}/${year}`;
  }

  const today = new Date().toLocaleDateString('en-GB');
  const formattedBasic = parseFloat(basicSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formattedAllowance = parseFloat(otherAllowance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formattedTotal = parseFloat(totalMonthlySalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const cycle = paymentCycle.toLowerCase();

  // Common content sections that all templates share
  const commonContent = {
    positionAndResponsibilities: `1. POSITION AND RESPONSIBILITIES
Your initial designation will be ${designation}, reporting directly to the Department Head. Your duties and responsibilities will be as standard for this position, along with any other assignments delegated by the management.`,

    probationaryPeriod: `2. PROBATIONARY PERIOD
In accordance with the UAE Labor Law, you will serve a probationary period of six (6) months starting from your date of joining, which is proposed to be ${formattedJoiningDate || '[Joining Date]'}. During this period, your performance will be evaluated, and employment may be terminated by either party with written notice as per standard regulations.`,

    compensation: `3. COMPENSATION AND BENEFITS
Your compensation package is structured on a ${cycle} cycle as follows:
   - Basic Salary: ${currency} ${formattedBasic}
   - Housing and Other Allowances: ${currency} ${formattedAllowance}
   - Total Gross Monthly Salary: ${currency} ${formattedTotal}
   
All payments will be processed via bank transfer through the Wages Protection System (WPS) in accordance with UAE regulations. You will also be eligible for standard benefits, including comprehensive medical insurance and annual flight allowance, as per company policy.`,

    leaveEntitlements: `4. LEAVE ENTITLEMENTS
You will be entitled to paid annual leave of 30 calendar days per completed year of service, in addition to standard public holidays announced by the UAE government.`,

    confidentiality: `5. CONFIDENTIALITY AND CODE OF CONDUCT
During and after your employment, you agree to maintain the strict confidentiality of all proprietary business, customer, and operational information. You will also be expected to adhere to the company's code of conduct and professional standards.`,

    contingency: `This offer of employment is contingent upon the successful validation of your references, educational credentials, and the procurement of a valid UAE work permit and residency visa.`,

    acceptance: `Please indicate your acceptance of this offer by signing and returning a copy of this letter. We are thrilled at the prospect of you joining our team and look forward to building a successful future together.

Sincerely,

Human Resources Department
UAE Operations

---------------------------------------------------------
ACCEPTANCE OF OFFER:
I, ${fullName}, hereby accept the terms and conditions of employment as detailed above.

Signature: ____________________      Date: ____________________`
  };

  // Template-specific formatting
  const templates = {
    corporate: () => `[COMPANY LETTERHEAD]

Date: ${today}

PRIVATE & CONFIDENTIAL

To: ${fullName}
Position Offered: ${designation}

Subject: Offer of Employment

Dear ${fullName},

On behalf of the Company, we are pleased to extend this formal offer of employment for the position of ${designation}. We were highly impressed by your qualifications and experience, and we believe your skills will be a valuable addition to our organization.

Below are the key terms and conditions of your employment offer:

${commonContent.positionAndResponsibilities}

${commonContent.probationaryPeriod}

${commonContent.compensation}

${commonContent.leaveEntitlements}

${commonContent.confidentiality}

${commonContent.contingency}

${commonContent.acceptance}`,

    modern: () => `${fullName}
${firstName}

[COMPANY NAME]
Innovation | Excellence | Growth

Date: ${today}
Reference: OEL/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000)}

Re: Job Offer - ${designation}

Dear ${firstName},

We are excited to offer you the position of ${designation} at [Company Name]. We were highly impressed by your qualifications and experience, and we believe your skills will be a great addition to our organization.

THE OPPORTUNITY
Join a forward-thinking company where innovation meets excellence.

${commonContent.positionAndResponsibilities.replace('1. POSITION AND RESPONSIBILITIES\n', '')}

${commonContent.probationaryPeriod.replace('2. PROBATIONARY PERIOD\n', '')}

${commonContent.compensation.replace('3. COMPENSATION AND BENEFITS\n', '')}

${commonContent.leaveEntitlements.replace('4. LEAVE ENTITLEMENTS\n', '')}

${commonContent.confidentiality.replace('5. CONFIDENTIALITY AND CODE OF CONDUCT\n', '')}

${commonContent.contingency}

${commonContent.acceptance.replace('Please indicate your acceptance', 'Please indicate your acceptance')}`,

    professional: () => `[COMPANY NAME]
Excellence in Service Since [Year]

Date: ${today}
Our Ref: HR/EMP/${new Date().getFullYear()}/[ID]

PRIVATE & CONFIDENTIAL

To: ${fullName}
${firstName}

Dear Mr./Ms. ${firstName},

OFFER OF EMPLOYMENT - ${designation}

With reference to your application and subsequent interview, we are pleased to offer you the position of ${designation} at [Company Name].

EMPLOYMENT TERMS

${commonContent.positionAndResponsibilities.replace('1. POSITION AND RESPONSIBILITIES\n', '')}

${commonContent.probationaryPeriod.replace('2. PROBATIONARY PERIOD\n', '')}

${commonContent.compensation.replace('3. COMPENSATION AND BENEFITS\n', '')}

${commonContent.leaveEntitlements.replace('4. LEAVE ENTITLEMENTS\n', '')}

${commonContent.confidentiality.replace('5. CONFIDENTIALITY AND CODE OF CONDUCT\n', '')}

${commonContent.contingency}

We look forward to your favorable response.

Yours faithfully,

____________________
[Name]
Chief Human Resources Officer

${commonContent.acceptance.split('---------------------------------------------------------')[1]}`,

    // In the elegant template section, replace with this clean version:
elegant: () => `=========================================
             [COMPANY NAME]
           Excellence Through Innovation
=========================================

Date: ${today}
Ref: OEL/${new Date().getFullYear()}/[Serial No.]

PRIVATE & CONFIDENTIAL

To: ${fullName}

Dear ${firstName},

RE: APPOINTMENT AS ${designation.toUpperCase()}

Following our recent deliberations, it gives us great pleasure to extend this formal offer of employment for the position of ${designation} at [Company Name].

We were thoroughly impressed by your qualifications and believe your expertise will significantly contribute to our continued success.

TERMS OF APPOINTMENT

1. POSITION AND RESPONSIBILITIES
Your initial designation will be ${designation}, reporting directly to the Department Head. Your duties and responsibilities will be as standard for this position, along with any other assignments delegated by the management.

2. PROBATIONARY PERIOD
In accordance with the UAE Labor Law, you will serve a probationary period of six (6) months starting from your date of joining, which is proposed to be ${formattedJoiningDate || '[Joining Date]'}. During this period, your performance will be evaluated, and employment may be terminated by either party with written notice as per standard regulations.

3. COMPENSATION AND BENEFITS
Your compensation package is structured on a ${paymentCycle.toLowerCase()} cycle as follows:
   - Basic Salary: ${currency} ${formattedBasic}
   - Housing and Other Allowances: ${currency} ${formattedAllowance}
   - Total Gross Monthly Salary: ${currency} ${formattedTotal}
   
All payments will be processed via bank transfer through the Wages Protection System (WPS) in accordance with UAE regulations. You will also be eligible for standard benefits, including comprehensive medical insurance and annual flight allowance, as per company policy.

4. LEAVE ENTITLEMENTS
You will be entitled to paid annual leave of 30 calendar days per completed year of service, in addition to standard public holidays announced by the UAE government.

5. CONFIDENTIALITY AND CODE OF CONDUCT
During and after your employment, you agree to maintain the strict confidentiality of all proprietary business, customer, and operational information. You will also be expected to adhere to the company's code of conduct and professional standards.

This offer of employment is contingent upon the successful validation of your references, educational credentials, and the procurement of a valid UAE work permit and residency visa.

We look forward to a long and mutually beneficial relationship.

Yours sincerely,

____________________
[Signature]

[Name]
Managing Director

=========================================
ACCEPTANCE OF OFFER:

I, ${fullName}, hereby accept the terms and conditions of employment as detailed above.

Signature: ____________________      Date: ____________________
=========================================`,

    tech: () => `> [COMPANY NAME] <
> Innovating Tomorrow Today <

Date: ${today}
Offer ID: OEL-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}

TO: ${fullName}
FROM: Talent Acquisition Team
SUBJECT: Job Offer - ${designation}

Hello ${firstName},

We're excited to offer you the position of ${designation} at [Company Name]! We were highly impressed by your qualifications and experience.

⚡ THE ROLE
${commonContent.positionAndResponsibilities.replace('1. POSITION AND RESPONSIBILITIES\n', '')}

📋 PROBATION
${commonContent.probationaryPeriod.replace('2. PROBATIONARY PERIOD\n', '')}

💰 COMPENSATION
${commonContent.compensation.replace('3. COMPENSATION AND BENEFITS\n', '').replace(/\n   - /g, '\n• ').replace(/- /g, '• ').replace('   -', '•')}

🌴 LEAVE POLICY
${commonContent.leaveEntitlements.replace('4. LEAVE ENTITLEMENTS\n', '')}

🔒 CONFIDENTIALITY
${commonContent.confidentiality.replace('5. CONFIDENTIALITY AND CODE OF CONDUCT\n', '')}

✅ CONDITIONS
${commonContent.contingency}

${commonContent.acceptance.replace('Please indicate your acceptance', 'Please indicate your acceptance').replace('---------------------------------------------------------', '---')}`,

    minimalist: () => `[COMPANY NAME]
[Company Address]

Date: ${today}
Reference: OEL-${new Date().getFullYear()}-[ID]

To: ${fullName}
Re: Offer of Employment - ${designation}

Dear ${firstName},

We are pleased to offer you the position of ${designation} at [Company Name].

EMPLOYMENT TERMS:

${commonContent.positionAndResponsibilities.replace(/^\d+\. /g, '').replace(/\n/g, '\n\n')}

${commonContent.probationaryPeriod.replace(/^\d+\. /g, '').replace(/\n/g, '\n\n')}

${commonContent.compensation.replace(/^\d+\. /g, '').replace(/\n/g, '\n\n')}

${commonContent.leaveEntitlements.replace(/^\d+\. /g, '').replace(/\n/g, '\n\n')}

${commonContent.confidentiality.replace(/^\d+\. /g, '').replace(/\n/g, '\n\n')}

${commonContent.contingency}

${commonContent.acceptance.split('---------------------------------------------------------')[1]}`,

    traditional: () => `[COMPANY SEAL]

${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}

My Dear ${firstName},

It is with great pleasure that I write to offer you the position of ${designation} at [Company Name].

We have been most impressed with your credentials and believe you will serve the company well in this capacity.

The terms of your appointment are as follows:

${commonContent.positionAndResponsibilities.replace(/^\d+\. /g, '').replace(/\n/g, '\n\n')}

${commonContent.probationaryPeriod.replace(/^\d+\. /g, '').replace(/\n/g, '\n\n')}

${commonContent.compensation.replace(/^\d+\. /g, '').replace(/\n/g, '\n\n')}

${commonContent.leaveEntitlements.replace(/^\d+\. /g, '').replace(/\n/g, '\n\n')}

${commonContent.confidentiality.replace(/^\d+\. /g, '').replace(/\n/g, '\n\n')}

${commonContent.contingency}

I trust you will find these terms agreeable and look forward to your favorable response.

I remain,

Yours faithfully,

____________________
[Signature]
[Name]
[Title]

${commonContent.acceptance.split('---------------------------------------------------------')[1].replace('Signature: ____________________      Date: ____________________', 'Signature: ____________________\nDate: ____________________\nWitness: ____________________')}`
  };

  const generator = templates[templateId];
  return generator ? generator() : templates.corporate();
};

// Get template categories for organization
export const getTemplateCategories = () => {
  const categories = {};
  Object.values(TEMPLATES).forEach(template => {
    if (!categories[template.category]) {
      categories[template.category] = [];
    }
    categories[template.category].push(template);
  });
  return categories;
};

// Get all templates
export const getAllTemplates = () => Object.values(TEMPLATES);

// Get template by ID
export const getTemplateById = (id) => TEMPLATES[id] || TEMPLATES.corporate;