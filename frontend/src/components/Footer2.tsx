import React from "react";

const Footer2: React.FC = () => (
  <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/70 bg-white/60 px-6 py-4 text-xs font-medium text-[#14226B]">
    <span className="text-gray-600">© {new Date().getFullYear()} OnexHR. All rights reserved.</span>
    <span>
      People. Progress. Together. <span className="text-rose-500">♥</span>
    </span>
  </footer>
);

export default Footer2;
