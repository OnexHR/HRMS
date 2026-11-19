// import React, { useState } from "react";
// import { ShieldCheck, Lock } from "lucide-react";
// import Sidebar from "../components/Sidebar";
// import Header from "../components/Header";
// import {
//   PasswordInputField,
//   PasswordRequirementsChecklist,
//   UpdatePasswordButton,
// } from "../../StudentDashboard/components/PasswordSettingsControls";
// import { useChangePassword } from "../../../hooks/useChangePassword";

// const PASSWORD_REGEX =
//   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

// const ManagerPasswordSettings: React.FC = () => {
//   const [currentPassword, setCurrentPassword] = useState("");
//   const [newPassword, setNewPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [validationError, setValidationError] = useState<string | null>(null);

//   const {
//     changePassword,
//     loading,
//     error,
//     success,
//   } = useChangePassword();

//   const isPasswordValid = PASSWORD_REGEX.test(newPassword);
//   const canSubmit =
//     currentPassword.length > 0 &&
//     isPasswordValid &&
//     confirmPassword.length > 0 &&
//     !loading;

//   const handleSubmit = async () => {
//     setValidationError(null);

//     if (newPassword === currentPassword) {
//       setValidationError(
//         "New password cannot be the same as your current password."
//       );
//       return;
//     }

//     if (newPassword !== confirmPassword) {
//       setValidationError("New password and confirm password do not match.");
//       return;
//     }

//     await changePassword(currentPassword, newPassword);

//     setCurrentPassword("");
//     setNewPassword("");
//     setConfirmPassword("");
//   };

//   return (
//     <div className="min-h-screen bg-slate-50 text-gray-800">
//       <Sidebar active="settings" />

//       <main className="ml-60">
//         <Header managerId="MGR001" />

//         <div className="space-y-6 p-6">
//           <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
//             <div className="flex items-center gap-2.5">
//               <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2459A6]">
//                 <ShieldCheck size={20} />
//               </div>

//               <div>
//                 <h2 className="text-lg font-semibold text-[#10284A]">
//                   Password Settings
//                 </h2>
//                 <p className="text-sm text-gray-500">
//                   Manage your password and keep your account secure.
//                 </p>
//               </div>
//             </div>

//             <div className="mt-5 rounded-2xl border border-gray-100 p-5">
//               <div className="mb-1 flex items-center gap-1.5">
//                 <Lock size={16} className="text-[#10284A]" />
//                 <h3 className="text-sm font-semibold text-[#10284A]">
//                   Change Password
//                 </h3>
//               </div>

//               <p className="mb-4 text-sm text-gray-500">
//                 Use a strong password you don't use elsewhere.
//               </p>

//               <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,680px)_1fr]">
//                 <div className="flex flex-col gap-3">
//                   <PasswordInputField
//                     label="Current Password"
//                     placeholder="Enter your current password"
//                     value={currentPassword}
//                     onChange={setCurrentPassword}
//                   />

//                   <PasswordInputField
//                     label="New Password"
//                     placeholder="Enter your new password"
//                     value={newPassword}
//                     onChange={setNewPassword}
//                   />

//                   <PasswordInputField
//                     label="Confirm New Password"
//                     placeholder="Re-enter your new password"
//                     value={confirmPassword}
//                     onChange={setConfirmPassword}
//                   />

//                   {validationError && (
//                     <p className="text-xs text-rose-500">{validationError}</p>
//                   )}
//                   {error && <p className="text-xs text-rose-500">{error}</p>}
//                   {success && (
//                     <p className="text-xs text-green-600">
//                       Password updated successfully.
//                     </p>
//                   )}

//                   <div className="mt-1">
//                     <UpdatePasswordButton
//                       onClick={handleSubmit}
//                       disabled={!canSubmit}
//                       loading={loading}
//                     />
//                   </div>
//                 </div>

//                 <div className="flex justify-center lg:pt-4">
//                   <PasswordRequirementsChecklist password={newPassword} />
//                 </div>
//               </div>
//             </div>
//           </section>
//         </div>
//       </main>
//     </div>
//   );
// };

// export default ManagerPasswordSettings;


import React, { useState } from "react";
import { ShieldCheck, Lock } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import {
  PasswordInputField,
  PasswordRequirementsChecklist,
  UpdatePasswordButton,
} from "../../StudentDashboard/components/PasswordSettingsControls";
import { useChangePassword } from "../../../hooks/useChangePassword";

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

const ManagerPasswordSettings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    changePassword,
    loading,
    error,
    success,
  } = useChangePassword("employee");

  const isPasswordValid = PASSWORD_REGEX.test(newPassword);
  const canSubmit =
    currentPassword.length > 0 &&
    isPasswordValid &&
    confirmPassword.length > 0 &&
    !loading;

  const handleSubmit = async () => {
    setValidationError(null);

    if (newPassword === currentPassword) {
      setValidationError(
        "New password cannot be the same as your current password."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError("New password and confirm password do not match.");
      return;
    }

    // Only clear the boxes once the change actually landed, otherwise a rejected
    // attempt wipes what the user typed and leaves them with nothing to retry.
    const saved = await changePassword(currentPassword, newPassword);

    if (saved) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      <Sidebar active="settings" />

      <main className="ml-60">
        <Header />

        <div className="space-y-6 p-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#2459A6]">
                <ShieldCheck size={20} />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-[#10284A]">
                  Password Settings
                </h2>
                <p className="text-sm text-gray-500">
                  Manage your password and keep your account secure.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-gray-100 p-5">
              <div className="mb-1 flex items-center gap-1.5">
                <Lock size={16} className="text-[#10284A]" />
                <h3 className="text-sm font-semibold text-[#10284A]">
                  Change Password
                </h3>
              </div>

              <p className="mb-4 text-sm text-gray-500">
                Use a strong password you don't use elsewhere.
              </p>

              <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,680px)_1fr]">
                <div className="flex flex-col gap-3">
                  <PasswordInputField
                    label="Current Password"
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                  />

                  <PasswordInputField
                    label="New Password"
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={setNewPassword}
                  />

                  <PasswordInputField
                    label="Confirm New Password"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                  />

                  {validationError && (
                    <p className="text-xs text-rose-500">{validationError}</p>
                  )}
                  {error && <p className="text-xs text-rose-500">{error}</p>}
                  {success && (
                    <p className="text-xs text-green-600">
                      Password updated successfully.
                    </p>
                  )}

                  <div className="mt-1">
                    <UpdatePasswordButton
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      loading={loading}
                    />
                  </div>
                </div>

                <div className="flex justify-center lg:pt-4">
                  <PasswordRequirementsChecklist password={newPassword} />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ManagerPasswordSettings;