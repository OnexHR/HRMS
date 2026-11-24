import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent, ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, ChevronRight,
  FileText, Hourglass, Info, Mail, Phone, ShieldCheck, Trash2, UploadCloud, Users, X,
} from "lucide-react";
import logo from "../../assets/OnexHRLogo.png";
import landingBackground from "../../assets/landingpagebg.webp";

type Branch = {
  branchName: string; branchAddress: string; country: string; state: string;
  city: string; postalCode: string; contactNumber: string; email: string;
};
type FormState = {
  organizationName: string; industry: string; officialEmail: string;
  registrationNumber: string; companyLogo: File | null; organizationType: string;
  website: string; contactNumber: string; taxIdentificationNumber: string;
  registeredAddress: string; country: string; state: string; city: string; postalCode: string;
  branches: Branch[]; fullName: string; designation: string; representativeEmail: string;
  mobileNumber: string; emailVerified: boolean; mobileVerified: boolean;
  registrationCertificate: File | null; gstCertificate: File | null;
  supportingDocuments: File | null; additionalDocuments: File | null; declarationAccepted: boolean;
};
type Errors = Record<string, string>;

const emptyBranch = (): Branch => ({
  branchName: "", branchAddress: "", country: "India", state: "", city: "",
  postalCode: "", contactNumber: "", email: "",
});
const initialState: FormState = {
  organizationName: "", industry: "", officialEmail: "", registrationNumber: "", companyLogo: null,
  organizationType: "", website: "", contactNumber: "", taxIdentificationNumber: "",
  registeredAddress: "", country: "India", state: "", city: "", postalCode: "",
  branches: [], fullName: "", designation: "", representativeEmail: "", mobileNumber: "",
  emailVerified: false, mobileVerified: false, registrationCertificate: null,
  gstCertificate: null, supportingDocuments: null, additionalDocuments: null, declarationAccepted: false,
};

const steps = ["Organization Details", "Address Details", "Authorized Representative", "Verification Documents"];
const industries = ["Information Technology", "Healthcare", "Education", "Finance & Banking", "Manufacturing", "Retail & E-commerce", "Hospitality", "Construction", "Marketing & Advertising", "Logistics", "Consulting", "Other"];
const organizationTypes = ["Private Limited Company", "Public Limited Company", "LLP", "Partnership", "Sole Proprietorship", "Startup", "NGO", "Government Organization", "Other"];
const states = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"];
const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:4000/api/v1";

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <label className="org-field">
      <span>{label}{required && <b>*</b>}</span>
      {children}
      {error && <small className="org-error">{error}</small>}
    </label>
  );
}

function UploadCard({ title, description, required, file, onFile, onRemove }: {
  title: string; description: string; required?: boolean; file: File | null;
  onFile: (file: File | null) => void; onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const accept = required ? ".pdf,.jpg,.jpeg,.png" : ".pdf,.jpg,.jpeg,.png";
  const selectFile = (candidate: File | undefined) => {
    if (!candidate) return;
    if (candidate.size > 5 * 1024 * 1024) { onFile(null); return; }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(candidate.type)) { onFile(null); return; }
    onFile(candidate);
  };
  return (
    <div className={`org-upload-card ${drag ? "is-dragging" : ""}`}>
      <div className="org-upload-title"><FileText size={18}/><strong>{title}</strong>{required && <b>*</b>}</div>
      <p>{description}</p>
      <input ref={inputRef} type="file" accept={accept} hidden onChange={(e) => selectFile(e.target.files?.[0])}/>
      {file ? (
        <div className="org-selected-file">
          <FileText size={20}/>
          <div><strong>{file.name}</strong><span>{(file.size / 1024).toFixed(1)} KB</span></div>
          <button type="button" onClick={onRemove} aria-label={`Remove ${title}`}><Trash2 size={17}/></button>
        </div>
      ) : (
        <button type="button" className="org-dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e: DragEvent) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); selectFile(e.dataTransfer.files[0]); }}>
          <UploadCloud size={23}/>
          <span><strong>Choose file</strong> or drag and drop</span>
          <small>PDF, JPG, PNG · Max 5 MB</small>
        </button>
      )}
    </div>
  );
}

type Props = { open: boolean; onClose: () => void };
export default function OrganizationRegistration({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Errors>({});
  const [otpTarget, setOtpTarget] = useState<"email" | "mobile" | null>(null);
  const [otp, setOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState<{registrationId:string; organizationName:string; submissionDate:string}|null>(null);
  const [showSuccessDetails, setShowSuccessDetails] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  if (!open) return null;
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  const validateStep = () => {
    const next: Errors = {};
    if (step === 0) {
      if (!form.organizationName.trim()) next.organizationName = "Organization name is required.";
      if (!form.organizationType) next.organizationType = "Organization type is required.";
      if (!form.industry) next.industry = "Industry is required.";
      if (!/^\S+@\S+\.\S+$/.test(form.officialEmail)) next.officialEmail = "Enter a valid email address.";
      if (!form.contactNumber.trim()) next.contactNumber = "Contact number is required.";
      if (form.companyLogo) {
        if (form.companyLogo.size > 2 * 1024 * 1024) next.companyLogo = "Logo must not exceed 2 MB.";
        if (!["image/png", "image/jpeg"].includes(form.companyLogo.type)) next.companyLogo = "Upload PNG, JPG or JPEG.";
      }
    }
    if (step === 1) {
      if (!form.registeredAddress.trim()) next.registeredAddress = "Registered office address is required.";
      if (!form.country) next.country = "Country is required.";
      if (!form.state) next.state = "State is required.";
      if (!form.city.trim()) next.city = "City is required.";
      if (!form.postalCode.trim()) next.postalCode = "Postal code is required.";
      form.branches.forEach((branch, index) => {
        ["branchName", "branchAddress", "country", "state", "city", "postalCode"].forEach((key) => {
          if (!String(branch[key as keyof Branch]).trim()) next[`branch-${index}-${key}`] = "Required.";
        });
      });
    }
    if (step === 2) {
      if (!form.fullName.trim()) next.fullName = "Full name is required.";
      if (!/^\S+@\S+\.\S+$/.test(form.representativeEmail)) next.representativeEmail = "Enter a valid email address.";
      if (!form.designation) next.designation = "Designation is required.";
      if (!/^[+]?[\d\s-]{8,18}$/.test(form.mobileNumber)) next.mobileNumber = "Enter a valid mobile number.";
      if (!form.emailVerified) next.emailVerified = "Email verification is required.";
      if (!form.mobileVerified) next.mobileVerified = "Mobile verification is required.";
    }
    if (step === 3) {
      if (!form.registrationCertificate) next.registrationCertificate = "Company registration certificate is required.";
      if (!form.declarationAccepted) next.declarationAccepted = "Accept the declaration to continue.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const goNext = () => {
    if (!validateStep()) return;
    setStep((current) => Math.min(current + 1, 4));
  };
  const cancel = () => {
    setStep(0); setForm(initialState); setErrors({}); setSuccess(null); setShowSuccessDetails(false); setOtpTarget(null); onClose();
  };

  const sendOtp = async (channel: "email" | "mobile") => {
    const destination = channel === "email" ? form.representativeEmail : form.mobileNumber;
    if (!destination) return;
    setOtpLoading(true); setOtpMessage("");
    try {
      const response = await fetch(`${apiBase}/organization-registration/otp/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, destination }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Unable to send OTP.");
      setOtpTarget(channel); setOtp(""); setCountdown(30);
      setOtpMessage(data.data?.developmentOtp ? `Development OTP: ${data.data.developmentOtp}` : "OTP sent successfully.");
    } catch (error) {
      setOtpMessage(error instanceof Error ? error.message : "Unable to send OTP.");
    } finally { setOtpLoading(false); }
  };
  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (!otpTarget) return;
    const destination = otpTarget === "email" ? form.representativeEmail : form.mobileNumber;
    setOtpLoading(true); setOtpMessage("");
    try {
      const response = await fetch(`${apiBase}/organization-registration/otp/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: otpTarget, destination, otp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Invalid OTP.");
      setField(otpTarget === "email" ? "emailVerified" : "mobileVerified", true);
      setOtpTarget(null); setOtp("");
    } catch (error) {
      setOtpMessage(error instanceof Error ? error.message : "Verification failed.");
    } finally { setOtpLoading(false); }
  };

  const submitRegistration = async () => {
    setSubmitError("");
    if (!validateAll()) { setStep(0); return; }
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("payload", JSON.stringify({
        organizationName: form.organizationName, organizationType: form.organizationType,
        industry: form.industry, officialEmail: form.officialEmail, website: form.website,
        contactNumber: form.contactNumber, registrationNumber: form.registrationNumber,
        taxIdentificationNumber: form.taxIdentificationNumber, registeredAddress: form.registeredAddress,
        country: form.country, state: form.state, city: form.city, postalCode: form.postalCode,
        branches: form.branches,
        authorizedRepresentative: {
          fullName: form.fullName, designation: form.designation,
          officialEmail: form.representativeEmail, mobileNumber: form.mobileNumber,
          emailVerified: form.emailVerified, mobileVerified: form.mobileVerified,
        },
        declarationAccepted: form.declarationAccepted,
      }));
      if (form.companyLogo) body.append("companyLogo", form.companyLogo);
      if (form.registrationCertificate) body.append("registrationCertificate", form.registrationCertificate);
      if (form.gstCertificate) body.append("gstCertificate", form.gstCertificate);
      if (form.supportingDocuments) body.append("supportingDocuments", form.supportingDocuments);
      if (form.additionalDocuments) body.append("additionalDocuments", form.additionalDocuments);
      const response = await fetch(`${apiBase}/organization-registration/registrations`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Registration submission failed.");
      setSuccess({ registrationId: data.data.registrationId, organizationName: data.data.organizationName, submissionDate: data.data.submissionDate });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Registration submission failed.");
    } finally { setSubmitting(false); }
  };
  const validateAll = () => {
    if (!form.organizationName || !form.organizationType || !form.industry || !/^\S+@\S+\.\S+$/.test(form.officialEmail) ||
      !form.contactNumber || !form.registeredAddress || !form.country || !form.state || !form.city || !form.postalCode ||
      !form.fullName || !form.designation || !/^\S+@\S+\.\S+$/.test(form.representativeEmail) || !form.mobileNumber ||
      !form.emailVerified || !form.mobileVerified || !form.registrationCertificate || !form.declarationAccepted) return false;
    return true;
  };

  const renderReviewValue = (value: string) => value || "—";
  return (
    <div className="org-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="org-modal" role="dialog" aria-modal="true" aria-labelledby="org-title">
        <aside className="org-sidebar">
          <img className="org-sidebar-logo" src={logo} alt="OnexHR"/>
          <h2>Register Your Organization</h2>
          <p>Create your organization's workspace on OnexHR. Submit your details for verification and approval.</p>
          <div className="org-illustration">
            <img src={landingBackground} alt="Corporate office with business professionals"/>
          </div>
          <div className="org-benefits">
            <div><ShieldCheck/><span><strong>Secure &amp; Reliable</strong><small>Your data is always protected.</small></span></div>
            <div><Users/><span><strong>Grow Together</strong><small>Build a stronger team.</small></span></div>
            <div><CheckCircle2/><span><strong>Dedicated Support</strong><small>We're here to help.</small></span></div>
          </div>
        </aside>
        <main className="org-content">
          <button type="button" className="org-close" onClick={cancel} aria-label="Close"><X size={20}/></button>
          {success ? (
            <section className="org-success-placeholder" aria-hidden="true" />
          ) : (
            <>
              {step < 4 && (
                <nav className="org-stepper" aria-label="Registration progress">
                  {steps.map((label, index) => (
                    <div className={`org-step ${index === step ? "active" : ""} ${index < step ? "complete" : ""}`} key={label}>
                      <span>{index < step ? <Check size={14}/> : index + 1}</span><b>{label}</b>
                    </div>
                  ))}
                </nav>
              )}
              {step === 0 && (
                <section>
                  <h1 id="org-title" className="org-section-title"><Building2 size={20}/> Organization Details</h1>
                  <div className="org-form-grid">
                    <Field label="Organization Name" required error={errors.organizationName}>
                      <input value={form.organizationName} onChange={(e) => setField("organizationName", e.target.value)} placeholder="Enter organization name"/>
                    </Field>
                    <Field label="Organization Type" required error={errors.organizationType}>
                      <select value={form.organizationType} onChange={(e) => setField("organizationType", e.target.value)}><option value="">Select organization type</option>{organizationTypes.map((value) => <option key={value}>{value}</option>)}</select>
                    </Field>
                    <Field label="Industry" required error={errors.industry}>
                      <select value={form.industry} onChange={(e) => setField("industry", e.target.value)}><option value="">Select industry</option>{industries.map((value) => <option key={value}>{value}</option>)}</select>
                    </Field>
                    <Field label="Website">
                      <input type="url" value={form.website} onChange={(e) => setField("website", e.target.value)} placeholder="https://"/>
                    </Field>
                    <Field label="Official Email" required error={errors.officialEmail}>
                      <input type="email" value={form.officialEmail} onChange={(e) => setField("officialEmail", e.target.value)} placeholder="admin@organization.com"/>
                    </Field>
                    <Field label="Contact Number" required error={errors.contactNumber}>
                      <div className="org-phone"><span>+91</span><input type="tel" value={form.contactNumber} onChange={(e) => setField("contactNumber", e.target.value)} placeholder="98765 43210"/></div>
                    </Field>
                    <Field label="Company Registration Number">
                      <input value={form.registrationNumber} onChange={(e) => setField("registrationNumber", e.target.value)} placeholder="Enter registration number"/>
                    </Field>
                    <Field label="Tax Identification Number">
                      <input value={form.taxIdentificationNumber} onChange={(e) => setField("taxIdentificationNumber", e.target.value.toUpperCase())} placeholder="GSTIN / Tax ID"/>
                    </Field>
                  </div>
                  <Field label="Company Logo" error={errors.companyLogo}>
                    {form.companyLogo ? <div className="org-logo-file"><img src={URL.createObjectURL(form.companyLogo)} alt="Company logo preview"/><button type="button" onClick={() => setField("companyLogo", null)}><Trash2 size={16}/> Remove</button></div> :
                      <label className="org-logo-upload"><UploadCloud size={22}/><span>Upload logo</span><small>PNG, JPG or JPEG · Max 2 MB</small><input type="file" accept="image/png,image/jpeg" onChange={(e: ChangeEvent<HTMLInputElement>) => setField("companyLogo", e.target.files?.[0] ?? null)}/></label>}
                  </Field>
                  <div className="org-banner">You can complete the remaining details in the next step.</div>
                </section>
              )}
              {step === 1 && (
                <section>
                  <h1>Address Details</h1><p className="org-subtitle">Tell us about your organization's address.</p>
                  <div className="org-form-grid">
                    <Field label="Registered Office Address" required error={errors.registeredAddress}>
                      <textarea maxLength={500} value={form.registeredAddress} onChange={(e) => setField("registeredAddress", e.target.value)} placeholder="Enter complete address"/><small className="org-count">{form.registeredAddress.length}/500</small>
                    </Field>
                    <Field label="Country" required error={errors.country}>
                      <select value={form.country} onChange={(e) => setField("country", e.target.value)}><option>India</option><option>United States</option><option>United Kingdom</option><option>United Arab Emirates</option><option>Singapore</option></select>
                    </Field>
                    <Field label="State" required error={errors.state}>
                      {form.country === "India" ? <select value={form.state} onChange={(e) => setField("state", e.target.value)}><option value="">Select state</option>{states.map((value) => <option key={value}>{value}</option>)}</select> : <input value={form.state} onChange={(e) => setField("state", e.target.value)} placeholder="State / Province"/>}
                    </Field>
                    <Field label="City" required error={errors.city}><input value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="City"/></Field>
                    <Field label="Postal Code" required error={errors.postalCode}><input value={form.postalCode} onChange={(e) => setField("postalCode", e.target.value)} placeholder="Postal code"/></Field>
                  </div>
                  <div className="org-branch-heading"><h3>Branch Information <span>Optional</span></h3><button type="button" onClick={() => setForm((current) => ({...current, branches: [...current.branches, emptyBranch()]}))}>+ Add Branch / Additional Office</button></div>
                  {form.branches.map((branch, index) => (
                    <div className="org-branch" key={index}>
                      <div className="org-branch-top"><strong>Branch {index + 1}</strong><button type="button" onClick={() => setForm((current) => ({...current, branches: current.branches.filter((_, i) => i !== index)}))}><Trash2 size={16}/> Remove</button></div>
                      <div className="org-form-grid">
                        {(["branchName","branchAddress","state","city","postalCode","contactNumber","email"] as const).map((key) => (
                          <Field label={key === "branchName" ? "Branch Name" : key === "branchAddress" ? "Branch Address" : key === "contactNumber" ? "Branch Contact Number" : key === "email" ? "Branch Email" : key === "postalCode" ? "Postal Code" : key.charAt(0).toUpperCase()+key.slice(1)} required={["branchName","branchAddress","state","city","postalCode"].includes(key)} error={errors[`branch-${index}-${key}`]} key={key}>
                            {key === "branchAddress" ? <textarea value={branch[key]} onChange={(e) => setForm((current) => ({...current, branches: current.branches.map((item, i) => i === index ? {...item, [key]: e.target.value} : item)}))}/> :
                              <input type={key === "email" ? "email" : key === "contactNumber" ? "tel" : "text"} value={branch[key]} onChange={(e) => setForm((current) => ({...current, branches: current.branches.map((item, i) => i === index ? {...item, [key]: e.target.value} : item)}))}/>}
                          </Field>
                        ))}
                        <Field label="Country" required error={errors[`branch-${index}-country`]}><select value={branch.country} onChange={(e) => setForm((current) => ({...current, branches: current.branches.map((item, i) => i === index ? {...item, country: e.target.value} : item)}))}><option>India</option><option>United States</option><option>United Kingdom</option><option>United Arab Emirates</option></select></Field>
                      </div>
                    </div>
                  ))}
                </section>
              )}
              {step === 2 && (
                <section>
                  <h1>Authorized Representative Details</h1><p className="org-subtitle">Tell us about the authorized person representing your organization.</p>
                  <div className="org-form-grid">
                    <Field label="Full Name" required error={errors.fullName}><input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} placeholder="Enter full name"/></Field>
                    <Field label="Designation" required error={errors.designation}><select value={form.designation} onChange={(e) => setField("designation", e.target.value)}><option value="">Select designation</option>{["Director","Owner","HR Head","CEO","Managing Director","Administrator","Authorized Signatory","Other"].map((value) => <option key={value}>{value}</option>)}</select></Field>
                    <Field label="Official Email" required error={errors.representativeEmail}><input type="email" value={form.representativeEmail} onChange={(e) => setField("representativeEmail", e.target.value)} placeholder="representative@organization.com"/></Field>
                    <Field label="Mobile Number" required error={errors.mobileNumber}><div className="org-phone"><span>+91</span><input type="tel" value={form.mobileNumber} onChange={(e) => setField("mobileNumber", e.target.value)} placeholder="98765 43210"/></div></Field>
                  </div>
                  <div className="org-banner">This person will be contacted for verification purposes and will receive important updates regarding your registration request.</div>
                  <h3 className="org-verification-heading">Verification</h3>
                  <div className="org-verification-grid">
                    {[{channel:"email" as const, icon:<Mail/> , title:"Email Verification", text:"Click to verify your email address.", verified:form.emailVerified, destination:form.representativeEmail},
                      {channel:"mobile" as const, icon:<Phone/>, title:"Mobile Verification", text:"Click to verify your mobile number.", verified:form.mobileVerified, destination:form.mobileNumber}].map((item) => (
                      <div className="org-verification-card" key={item.channel}>
                        <div className="org-verification-icon">{item.icon}</div>
                        <div><strong>{item.title}</strong><p>{item.text}</p>{item.verified ? <span className="org-verified"><CheckCircle2 size={15}/> Verified</span> : <span className="org-unverified">Not verified</span>}</div>
                        <button type="button" disabled={!item.destination || item.verified || otpLoading} onClick={() => sendOtp(item.channel)}>{item.verified ? "Verified" : "Verify"}</button>
                      </div>
                    ))}
                  </div>
                  {(errors.emailVerified || errors.mobileVerified) && <small className="org-error">{errors.emailVerified || errors.mobileVerified}</small>}
                </section>
              )}
              {step === 3 && (
                <section>
                  <h1>Verification Documents</h1><p className="org-subtitle">Upload the required documents to complete your registration request.</p>
                  <div className="org-upload-grid">
                    <UploadCard title="Company Registration Certificate" description="Certificate of Incorporation / Registration." required file={form.registrationCertificate} onFile={(file) => setField("registrationCertificate", file)} onRemove={() => setField("registrationCertificate", null)}/>
                    <UploadCard title="GST Certificate" description="GST Registration Certificate." file={form.gstCertificate} onFile={(file) => setField("gstCertificate", file)} onRemove={() => setField("gstCertificate", null)}/>
                    <UploadCard title="Supporting Documents" description="Any additional documents." file={form.supportingDocuments} onFile={(file) => setField("supportingDocuments", file)} onRemove={() => setField("supportingDocuments", null)}/>
                    <UploadCard title="Additional Documents" description="Any other relevant documents." file={form.additionalDocuments} onFile={(file) => setField("additionalDocuments", file)} onRemove={() => setField("additionalDocuments", null)}/>
                  </div>
                  {errors.registrationCertificate && <small className="org-error">{errors.registrationCertificate}</small>}
                  <label className="org-declaration"><input type="checkbox" checked={form.declarationAccepted} onChange={(e) => setField("declarationAccepted", e.target.checked)} /><span>I hereby declare that all the information provided is true, accurate and complete to the best of my knowledge.</span></label>
                  {errors.declarationAccepted && <small className="org-error">{errors.declarationAccepted}</small>}
                </section>
              )}
              {step === 4 && (
                <section className="org-review">
                  <h1>Review &amp; Submit</h1>
                  {[
                    {title:"Organization Information", edit:0, items:[["Organization Name",form.organizationName],["Organization Type",form.organizationType],["Industry",form.industry],["Official Email",form.officialEmail],["Contact Number",`+91 ${form.contactNumber}`],["Registration Number",form.registrationNumber],["Tax ID",form.taxIdentificationNumber]]},
                    {title:"Address Information", edit:1, items:[["Registered Address",form.registeredAddress],["Country",form.country],["State",form.state],["City",form.city],["Postal Code",form.postalCode]]},
                    {title:"Branch Information", edit:1, items:form.branches.length ? form.branches.flatMap((branch, i) => [[`Branch ${i+1}`,branch.branchName],["Address",branch.branchAddress]]) : [["Branches","None"]]},
                    {title:"Authorized Representative Information", edit:2, items:[["Full Name",form.fullName],["Designation",form.designation],["Official Email",form.representativeEmail],["Mobile Number",`+91 ${form.mobileNumber}`],["Email Verification",form.emailVerified?"Verified":"Not verified"],["Mobile Verification",form.mobileVerified?"Verified":"Not verified"]]},
                    {title:"Verification Documents", edit:3, items:[["Registration Certificate",form.registrationCertificate?.name],["GST Certificate",form.gstCertificate?.name],["Supporting Documents",form.supportingDocuments?.name],["Additional Documents",form.additionalDocuments?.name]]},
                  ].map((section) => (
                    <div className="org-review-card" key={section.title}>
                      <div className="org-review-title"><h3>{section.title}</h3><button type="button" onClick={() => setStep(section.edit)}>Edit</button></div>
                      <dl>{section.items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{renderReviewValue(value ?? "")}</dd></div>)}</dl>
                    </div>
                  ))}
                  <label className="org-declaration"><input type="checkbox" checked={form.declarationAccepted} readOnly/><span>Final declaration confirmed: the submitted information is true, accurate and complete.</span></label>
                  {submitError && <div className="org-submit-error" role="alert">{submitError}</div>}
                </section>
              )}
              {step < 4 ? (
                <footer className="org-actions">
                  {step === 0 ? <button type="button" className="org-secondary" onClick={cancel}>Cancel</button> : <button type="button" className="org-secondary" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={16}/> Previous</button>}
                  <button type="button" className="org-primary" onClick={goNext}>{step === 3 ? "Next: Review & Submit" : step === 2 ? "Next: Verification Documents" : step === 1 ? "Next: Authorized Representative" : "Next: Address Details"}<ChevronRight size={16}/></button>
                </footer>
              ) : (
                <footer className="org-actions">
                  <button type="button" className="org-secondary" onClick={cancel}>Cancel Registration</button>
                  <button type="button" className="org-primary" disabled={submitting} onClick={submitRegistration}>{submitting ? "Submitting..." : "Submit Registration"}<ArrowRight size={16}/></button>
                </footer>
              )}
            </>
          )}
        </main>
      </div>
      {success && (
        <div className="org-registration-success-backdrop" role="presentation">
          <section className="org-registration-success" role="dialog" aria-modal="true" aria-labelledby="registration-success-title">
            <button type="button" className="org-registration-success-close" onClick={cancel} aria-label="Close"><X size={20}/></button>
            {showSuccessDetails ? (
              <div className="org-registration-details">
                <div className="org-registration-details-icon"><Building2 size={30}/></div>
                <h2 id="registration-success-title">Organization Details</h2>
                <dl>
                  <div><dt>Organization Name</dt><dd>{success.organizationName}</dd></div>
                  <div><dt>Organization Type</dt><dd>{renderReviewValue(form.organizationType)}</dd></div>
                  <div><dt>Industry</dt><dd>{renderReviewValue(form.industry)}</dd></div>
                  <div><dt>Official Email</dt><dd>{renderReviewValue(form.officialEmail)}</dd></div>
                  <div><dt>Registration ID</dt><dd>{success.registrationId}</dd></div>
                  <div><dt>Status</dt><dd className="org-registration-details-status">Pending Verification</dd></div>
                </dl>
                <button type="button" className="org-primary org-registration-primary" onClick={() => setShowSuccessDetails(false)}>Back to Confirmation</button>
              </div>
            ) : (
              <>
                <div className="org-registration-illustration" aria-hidden="true">
                  <span className="org-registration-dot dot-one"/>
                  <span className="org-registration-dot dot-two"/>
                  <span className="org-registration-dot dot-three"/>
                  <span className="org-registration-building building-left"/>
                  <span className="org-registration-building building-right"/>
                  <div className="org-registration-hourglass"><Hourglass size={112} strokeWidth={1.7}/></div>
                </div>
                <h2 id="registration-success-title">Registration Complete!</h2>
                <p className="org-registration-subtitle">Your organization has been registered successfully.</p>
                <div className="org-registration-notice">
                  <Info size={24}/>
                  <p><strong>Your account is now under review. Our support team will verify the details and approve your organization shortly.</strong></p>
                </div>
                <p className="org-registration-followup">You'll receive a notification once your organization is approved.</p>
                <div className="org-registration-actions">
                  <button type="button" className="org-primary" onClick={cancel}>Go to Login <ArrowRight size={17}/></button>
                  <button type="button" className="org-secondary" onClick={() => setShowSuccessDetails(true)}>View Organization Details</button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      {otpTarget && (
        <div className="org-otp-overlay" role="dialog" aria-modal="true">
          <form className="org-otp-modal" onSubmit={verifyOtp}>
            <button type="button" className="org-close" onClick={() => setOtpTarget(null)} aria-label="Close"><X size={18}/></button>
            <div className="org-verification-icon">{otpTarget === "email" ? <Mail/> : <Phone/>}</div>
            <h2>Verify {otpTarget === "email" ? "Email" : "Mobile"}</h2>
            <p>Enter the six-digit code sent to {otpTarget === "email" ? form.representativeEmail : `+91 ${form.mobileNumber}`}</p>
            <input className="org-otp-input" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="000000" aria-label="Six-digit OTP"/>
            {otpMessage && <small className={otpMessage.includes("invalid") || otpMessage.includes("Unable") || otpMessage.includes("expired") ? "org-error" : "org-otp-note"}>{otpMessage}</small>}
            <button type="submit" className="org-primary" disabled={otp.length !== 6 || otpLoading}>{otpLoading ? "Verifying..." : "Verify OTP"}</button>
            <button type="button" className="org-resend" disabled={countdown > 0} onClick={() => sendOtp(otpTarget)}>{countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}</button>
          </form>
        </div>
      )}
    </div>
  );
}
