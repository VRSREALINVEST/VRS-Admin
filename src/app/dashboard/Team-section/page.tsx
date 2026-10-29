// "use client";

// import { useEffect, useRef, useState } from "react";
// import axios from "axios";

// interface TeamMember {
//   _id: string;
//   name: string;
//   role: string;
//   image: string;
// }

// export default function AdminTeamPage() {
//   const API = process.env.NEXT_PUBLIC_API_BASE_URL;

//   const [members, setMembers] = useState<TeamMember[]>([]);
//   const [name, setName] = useState("");
//   const [role, setRole] = useState("");
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [editing, setEditing] = useState<TeamMember | null>(null);
//   const [loading, setLoading] = useState(false);

//   const fileRef = useRef<HTMLInputElement>(null);

//   // Fetch team
//   const fetchTeam = async () => {
//     const res = await axios.get(`${API}/api/team`);
//     setMembers(res.data);
//   };

//   useEffect(() => {
//     if (API) fetchTeam();
//   }, [API]);

//   // Reset form
//   const resetForm = () => {
//     setName("");
//     setRole("");
//     setImageFile(null);
//     if (fileRef.current) fileRef.current.value = "";
//   };

//   // ADD MEMBER
//   const addMember = async () => {
//     if (!name || !role || !imageFile) return;

//     setLoading(true);

//     const formData = new FormData();
//     formData.append("name", name);
//     formData.append("role", role);
//     formData.append("image", imageFile);

//     await axios.post(`${API}/api/team`, formData);

//     resetForm();
//     fetchTeam();
//     setLoading(false);
//   };

//   // DELETE
//   const deleteMember = async (id: string) => {
//     await axios.delete(`${API}/api/team/${id}`);
//     setMembers((prev) => prev.filter((m) => m._id !== id));
//   };

//   // UPDATE
//   const updateMember = async () => {
//     if (!editing) return;

//     const formData = new FormData();
//     formData.append("name", name);
//     formData.append("role", role);

//     if (imageFile) {
//       formData.append("image", imageFile);
//     }

//     await axios.put(
//       `${API}/api/team/${editing._id}`,
//       formData
//     );

//     setEditing(null);
//     resetForm();
//     fetchTeam();
//   };

//   return (
//     <div className="p-10 bg-gray-100 min-h-screen">
//       <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg p-8">
//         <h1 className="text-2xl font-bold mb-6">
//           Team Members
//         </h1>

//         {/* ADD FORM */}
//         <div className="grid md:grid-cols-4 gap-4 mb-8">
//           <input
//             placeholder="Name"
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             className="border p-3 rounded-lg"
//           />

//           <input
//             placeholder="Role"
//             value={role}
//             onChange={(e) => setRole(e.target.value)}
//             className="border p-3 rounded-lg"
//           />

//           <input
//             type="file"
//             ref={fileRef}
//             accept="image/*"
//             onChange={(e) =>
//               e.target.files &&
//               setImageFile(e.target.files[0])
//             }
//             className="border p-3 rounded-lg"
//           />

//           <button
//             onClick={addMember}
//             disabled={loading}
//             className="bg-black text-white rounded-lg"
//           >
//             {loading ? "Adding..." : "Add Member"}
//           </button>
//         </div>

//         {/* TEAM LIST */}
//         <div className="space-y-4">
//           {members.map((member) => (
//             <div
//               key={member._id}
//               className="flex justify-between items-center border p-4 rounded-lg"
//             >
//               <div className="flex items-center gap-4">
//                 <img
//                   src={member.image}
//                   className="w-14 h-14 rounded-full object-cover"
//                 />
//                 <div>
//                   <p className="font-semibold">
//                     {member.name}
//                   </p>
//                   <p className="text-sm text-gray-500">
//                     {member.role}
//                   </p>
//                 </div>
//               </div>

//               <div className="flex gap-4">
//                 <button
//                   onClick={() => {
//                     setEditing(member);
//                     setName(member.name);
//                     setRole(member.role);
//                   }}
//                   className="text-blue-600"
//                 >
//                   Edit
//                 </button>

//                 <button
//                   onClick={() =>
//                     deleteMember(member._id)
//                   }
//                   className="text-red-600"
//                 >
//                   Delete
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* EDIT MODAL */}
//       {editing && (
//         <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
//           <div className="bg-white p-6 rounded-lg w-[400px]">
//             <h2 className="text-lg font-semibold mb-4">
//               Update Member
//             </h2>

//             <input
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               className="border p-2 w-full mb-3"
//             />

//             <input
//               value={role}
//               onChange={(e) => setRole(e.target.value)}
//               className="border p-2 w-full mb-3"
//             />

//             <input
//               type="file"
//               accept="image/*"
//               onChange={(e) =>
//                 e.target.files &&
//                 setImageFile(e.target.files[0])
//               }
//               className="mb-4"
//             />

//             <div className="flex justify-end gap-3">
//               <button
//                 onClick={() => {
//                   setEditing(null);
//                   resetForm();
//                 }}
//                 className="border px-4 py-2"
//               >
//                 Cancel
//               </button>

//               <button
//                 onClick={updateMember}
//                 className="bg-black text-white px-4 py-2"
//               >
//                 Update
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }



"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { apiErrorMessage, authHeaders } from "@/lib/adminApi";

interface TeamMember {
  _id: string;
  name: string;
  role: string;
  image: string;
}

export default function AdminTeamPage() {
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch team
  const fetchTeam = async () => {
    try {
      const res = await axios.get(`${API}/api/team`);
      setMembers(res.data);
    } catch {
      toast.error("Failed to load team members");
    }
  };

  useEffect(() => {
    if (API) fetchTeam();
  }, [API]);

  const resetForm = () => {
    setName("");
    setRole("");
    setImageFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ADD MEMBER
  const addMember = async () => {
    if (loading) return;

    if (!name || !role || !imageFile) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("name", name);
      formData.append("role", role);
      formData.append("image", imageFile);

      
      await axios.post(`${API}/api/team`, formData, { headers: authHeaders() });

      toast.success("Member added successfully");

      resetForm();
      fetchTeam();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to add member"));
    }

    setLoading(false);
  };

  // DELETE
  const deleteMember = async (id: string) => {
    if (!confirm("Are you sure you want to delete this member?")) return;

    try {
      await axios.delete(`${API}/api/team/${id}`, { headers: authHeaders() });
      setMembers((prev) => prev.filter((m) => m._id !== id));
      toast.success("Member deleted");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Delete failed"));
    }
  };

  // UPDATE
  const updateMember = async () => {
    if (!editing || loading) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("name", name);
      formData.append("role", role);

      if (imageFile) {
        formData.append("image", imageFile);
      }

      await axios.put(
        `${API}/api/team/${editing._id}`,
        formData,
        { headers: authHeaders() }
      );

      toast.success("Member updated");

      setEditing(null);
      resetForm();
      fetchTeam();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Update failed"));
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl p-10 space-y-10 border border-gray-100">

        <div>
          <h1 className="text-4xl font-bold text-gray-800">
            Team Members
          </h1>
          <p className="text-gray-500 mt-2">
            Manage your professional team
          </p>
        </div>

        {/* ADD FORM */}
        <div className="grid md:grid-cols-4 gap-4">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-300 focus:border-black focus:ring-2 focus:ring-black rounded-xl p-4"
          />

          <input
            placeholder="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border border-gray-300 focus:border-black focus:ring-2 focus:ring-black rounded-xl p-4"
          />

          <input
            type="file"
            ref={fileRef}
            accept="image/*"
            onChange={(e) =>
              e.target.files && setImageFile(e.target.files[0])
            }
            className="border border-dashed border-gray-400 rounded-xl p-4"
          />

          <button
            onClick={addMember}
            disabled={loading}
            className={`rounded-xl text-white font-semibold ${
              loading
                ? "bg-gray-500"
                : "bg-black hover:bg-gray-900"
            }`}
          >
            {loading ? "Adding..." : "Add Member"}
          </button>
        </div>

        {/* TEAM LIST */}
        <div className="space-y-6">
          {members.map((member) => (
            <div
              key={member._id}
              className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition p-6 rounded-2xl shadow-sm"
            >
              <div className="flex items-center gap-6">
                <img
                  src={member.image}
                  className="w-16 h-16 rounded-full object-cover shadow-md"
                />
                <div>
                  <p className="font-semibold text-lg">
                    {member.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {member.role}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setEditing(member);
                    setName(member.name);
                    setRole(member.role);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit
                </button>

                <button
                  onClick={() => deleteMember(member._id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-[420px] shadow-2xl space-y-6">

            <h2 className="text-2xl font-semibold">
              Update Member
            </h2>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 rounded-xl p-4 w-full"
            />

            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="border border-gray-300 rounded-xl p-4 w-full"
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                e.target.files && setImageFile(e.target.files[0])
              }
              className="border border-dashed border-gray-400 rounded-xl p-4 w-full"
            />

            {imageFile && (
              <img
                src={URL.createObjectURL(imageFile)}
                className="h-40 rounded-xl object-cover shadow-md"
              />
            )}

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setEditing(null);
                  resetForm();
                }}
                className="px-5 py-2 border rounded-xl hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={updateMember}
                disabled={loading}
                className={`px-5 py-2 rounded-xl text-white ${
                  loading
                    ? "bg-gray-500"
                    : "bg-black hover:bg-gray-900"
                }`}
              >
                {loading ? "Updating..." : "Update"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}


