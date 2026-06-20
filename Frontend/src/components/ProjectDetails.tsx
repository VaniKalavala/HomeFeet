// File: ProjectDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MapPin, IndianRupee, ArrowLeft, Users, Ruler, Compass,
  CheckSquare, XSquare, AlertTriangle, Tag, ArrowLeftRight, Phone, Mail
} from 'lucide-react';

const ProjectDetails: React.FC = () => {
  const { id } = useParams();
  const [project, setProject] = useState<any | null>(null);
  const [dealStatus, setDealStatus] = useState<'open' | 'closed'>('open');
  const [loading, setLoading] = useState(true);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`https://homefeet25.onrender.com/api/properties/${id}`);
        const data = await res.json();
        if (res.ok) {
          setProject(data.project);
          setDealStatus(data.project.dealStatus || 'open');
        }
      } catch (err) {
        console.error('Error fetching project:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  const handleShowContact = async () => {
    const email = localStorage.getItem('email');
    if (!email || !project?._id) return alert('Please login first');

    await fetch('https://homefeet25.onrender.com/api/interests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: email,
        propertyId: project._id
      })
    });

    setShowContact(true);
  };

  if (loading) return <p className="text-center mt-12">Loading project details...</p>;
  if (!project) return <p className="text-center text-red-600 mt-12">Project not found.</p>;

  const dimensions = project.dimensions?.match(/(\d+)\s*ft\s*x\s*(\d+)\s*ft/);
  const length = dimensions?.[1];
  const width = dimensions?.[2];

  const DealStatusBadge = ({ status }: { status: 'open' | 'closed' }) => (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
      status === 'open' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
    }`}>
      <Tag className="h-4 w-4" />
      <span className="font-medium capitalize">{status}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center mb-6">
          <Link
            to="/development-plots"
            className="inline-flex items-center text-teal-600 hover:text-teal-700 gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Projects
          </Link>
          <DealStatusBadge status={dealStatus} />
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="relative h-[500px]">
            <img
              src={`https://homefeet25.onrender.com${project.imageUrl}`}
              alt={project.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4">
              <span className="bg-teal-600 text-white px-4 py-2 rounded-full shadow-lg">
                {project.developmentType}
              </span>
            </div>
          </div>

          <div className="p-8">
            <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
            <p className="text-gray-600 flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5" />
              {project.location}
              {project.mapLink && (
                <a
                  href={project.mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:text-teal-700 ml-2"
                >
                  View on Map
                </a>
              )}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 p-6 bg-gray-50 rounded-lg">
              <div className="text-center">
                <Ruler className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                <p className="text-gray-600">Total Area</p>
                <p className="text-xl font-semibold">{project.totalArea}</p>
                {project.dimensions && <p className="text-sm text-gray-500">{project.dimensions}</p>}
              </div>
              <div className="text-center">
                <Users className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                <p className="text-gray-600">Development Ratio (Owner : Builder)</p>
                <p className="text-xl font-semibold">{project.developerRatio}</p>
              </div>
              <div className="text-center">
                <Compass className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                <p className="text-gray-600">Facing</p>
                <p className="text-xl font-semibold">{project.facing}</p>
              </div>
              <div className="text-center">
                <IndianRupee className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                <p className="text-gray-600">Goodwill</p>
                <p className="text-xl font-semibold">{project.goodwill}</p>
              </div>
            </div>

            {dimensions && (
              <div className="mb-8 bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Plot Dimensions</h3>
                <div className="flex justify-center">
                  <div className="relative">
                    <div
                      className="border-2 border-teal-600 rounded-lg"
                      style={{
                        width: '300px',
                        height: `${(Number(width) / Number(length)) * 300}px`
                      }}
                    >
                      <div className="absolute -top-8 left-0 w-full flex justify-center items-center">
                        <div className="flex items-center gap-2 text-teal-700">
                          <ArrowLeftRight className="h-4 w-4" />
                          <span className="font-medium">{length} ft</span>
                        </div>
                      </div>
                      <div className="absolute -right-20 top-0 h-full flex items-center">
                        <div className="flex items-center gap-2 text-teal-700" style={{ transform: 'rotate(90deg)' }}>
                          <ArrowLeftRight className="h-4 w-4" />
                          <span className="font-medium">{width} ft</span>
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-lg font-semibold text-teal-700">{project.totalArea}</p>
                          <p className="text-sm text-teal-600">Total Area</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Section */}
<div className="border-t pt-8 mt-8">
  <h2 className="text-2xl font-semibold mb-4">Contact Owner</h2>

  {!showContact ? (
    <button
      onClick={project.dealStatus === 'closed' ? undefined : handleShowContact}
      disabled={project.dealStatus === 'closed'}
      className={`px-6 py-2 rounded-lg font-semibold ${
        project.dealStatus === 'closed'
          ? 'bg-gray-400 text-white cursor-not-allowed'
          : 'bg-teal-600 text-white hover:bg-teal-700'
      }`}
    >
      Show Contact Details
    </button>
  ) : (
    <div className="space-y-2 text-gray-700 mt-4">
      <p className="flex items-center gap-2">
        <Phone className="h-5 w-5 text-teal-600" />
        {project.contactPhone || 'Not Provided'}
      </p>
      <p className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-teal-600" />
        {project.contactEmail || 'Not Provided'}
      </p>
    </div>
  )}
</div>


            <div className="text-center mt-8">
              <Link to="/development-plots" className="text-teal-600 hover:underline inline-flex items-center gap-2">
                <ArrowLeft className="h-5 w-5" />
                Back to Projects
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
