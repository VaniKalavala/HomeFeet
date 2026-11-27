import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, MapPin, Ruler, Users } from 'lucide-react';
import ListingsSidebar from './ListingsSidebar';
import { API_BASE, API_ORIGIN } from '../lib/api';

const UserPostedProperties: React.FC = () => {
  const navigate = useNavigate();
  const [userProperties, setUserProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fallbackImage = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80';
  const isDisplayableImage = (url = '') => url && !url.toLowerCase().includes('.pdf');
  const getCardImageUrl = (project: any) =>
    project.imageUrl || (isDisplayableImage(project.plotDiagramUrl) ? project.plotDiagramUrl : '');
  const isGeneratedDiagramPreview = (project: any) => !project.imageUrl && Boolean(getCardImageUrl(project));

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Please log in again.');
        return;
      }

      // Token-based lookup works for both phone and email accounts.
      let res = await fetch(`${API_BASE}/user-properties`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const phone = localStorage.getItem('phone');
        if (phone) {
          res = await fetch(`${API_BASE}/user-properties-by-phone/${phone}`);
        }
        if (!res.ok) {
          res = await fetch(`${API_BASE}/all`);
          const all = await res.json();
          const filtered = all.filter((p: any) => p.phone === phone || p.contactPhone === phone);
          setUserProperties(filtered);
          setError(null);
          return;
        }
      }

      const properties = await res.json();
      setUserProperties(properties);
      setError(null);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('Failed to fetch properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDeal = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to close the deal.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/properties/${id}/close`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await res.json();
      
      if (data.success) {
        setUserProperties((prev) =>
          prev.map((p) => (p._id === id ? { ...p, dealStatus: 'closed' } : p))
        );
        alert('Deal closed successfully!');
      } else {
        alert(data.error || 'Failed to close deal.');
      }
    } catch (err) {
      console.error('Error closing deal:', err);
      alert('Error closing the deal. Please try again.');
    }
  };

  const handleDeleteProperty = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to delete the property.');
      return;
    }

    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/properties/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const data = await res.json();
      
      if (data.success) {
        setUserProperties((prev) => prev.filter((p) => p._id !== id));
        alert('Property deleted successfully!');
      } else {
        alert(data.error || 'Failed to delete property.');
      }
    } catch (err) {
      console.error('Error deleting property:', err);
      alert('Error deleting the property. Please try again.');
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col">
        <ListingsSidebar activePage="posted" />
        <div className="min-w-0 flex-1 px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600"></div>
              <p className="mt-4 text-gray-600">Loading your properties...</p>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col">
        <ListingsSidebar activePage="posted" />
        <div className="min-w-0 flex-1 px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchProperties}
                className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col">
      <ListingsSidebar activePage="posted" />
      <div className="min-w-0 flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 rounded-lg bg-slate-950 p-6 text-white shadow-xl md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-amber-300">Owner Desk</p>
            <h2 className="mt-1 text-3xl font-black">Your Posted Properties</h2>
            <p className="mt-2 text-slate-300">Track moderation status, edit submissions, and close completed deals.</p>
          </div>
          <button
            onClick={() => navigate('/post-property')}
            className="ld-btn-primary bg-white text-slate-950 hover:bg-teal-50"
          >
            + Post New Property
          </button>
        </div>

        {userProperties.length === 0 ? (
          <div className="text-center py-12">
            <div className="rounded-lg border border-slate-200 bg-white p-10 shadow-sm">
              <p className="text-gray-600 text-lg mb-4">You haven't posted any properties yet.</p>
              <button
                onClick={() => navigate('/post-property')}
                className="ld-btn-primary"
              >
                Post Your First Property
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              You have {userProperties.length} propert{userProperties.length === 1 ? 'y' : 'ies'} listed
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userProperties.map((project) => (
                <div
                  key={project._id}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-48">
                    <img
                      src={getCardImageUrl(project) ? `${API_ORIGIN}${getCardImageUrl(project)}` : fallbackImage}
                      alt={project.projectName || project.title || 'Property'}
                      className={`h-full w-full ${isGeneratedDiagramPreview(project) ? 'bg-white object-contain p-2' : 'object-cover'}`}
                      onError={(e) => {
                        e.currentTarget.src = fallbackImage;
                        e.currentTarget.className = 'h-full w-full object-cover';
                      }}
                    />
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                      <span className="bg-teal-600 text-white px-3 py-1.5 rounded-full text-sm">
                        {project.developmentType || 'N/A'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                        project.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : project.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : project.dealStatus === 'closed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {project.status === 'rejected'
                          ? 'Rejected'
                          : project.status === 'pending'
                            ? 'Pending'
                            : project.dealStatus === 'closed'
                              ? 'Closed'
                              : 'Open'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold mb-2 line-clamp-2 min-h-[3.5rem]">
                      {project.projectName || project.title || 'Untitled Property'}
                    </h3>
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-4 w-4 text-gray-600 flex-shrink-0" />
                      <p className="text-gray-600 text-sm truncate">
                        {project.locality ? `${project.locality}, ${project.city || 'N/A'}` : project.location || 'Location not specified'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Ruler className="h-4 w-4 text-teal-600" />
                        <div>
                          <p className="text-xs text-gray-600">Total Area</p>
                          <p className="font-semibold text-sm">
                            {project.totalArea ? `${project.totalArea} ${project.areaUnit || ''}` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-teal-600" />
                        <div>
                          <p className="text-xs text-gray-600">Ratio</p>
                          <p className="font-semibold text-sm">{project.developerRatio || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {project.status === 'rejected' && (
                      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <p className="font-bold">Admin feedback</p>
                            <p className="mt-1 leading-5">
                              {project.rejectionReason || 'This listing was rejected by admin. Please edit the listing and submit corrected details.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-auto flex justify-between items-center pt-4 border-t">
                      <div className="text-teal-600 font-bold text-sm">
                        Advance: ₹{project.advance || 'N/A'}
                      </div>
                      <Link
                        to={`/project/${project._id}`}
                        className="text-sm text-teal-700 underline"
                      >
                        View Details
                      </Link>
                    </div>

                    <div className="flex justify-between gap-2 mt-3">
                      <button
                        onClick={() => navigate(`/edit-property/${project._id}`)}
                        className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                      >
                        Edit
                      </button>

                      {project.dealStatus === 'open' ? (
                        <button
                          onClick={() => handleCloseDeal(project._id)}
                          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                        >
                          Close Deal
                        </button>
                      ) : (
                        <button
                          disabled
                          className="cursor-not-allowed rounded-lg bg-slate-400 px-3 py-2 text-sm font-semibold text-white"
                        >
                          Closed
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteProperty(project._id)}
                        className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
};

export default UserPostedProperties;
