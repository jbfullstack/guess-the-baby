import React from 'react';
import { Image, Shuffle, Check, Edit3, Trash2, Save } from 'lucide-react';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

const PhotosManager = ({ photoManager, shuffleMessage }) => {
  const {
    selectedPhotos,
    photoOrder,
    editingPhoto,
    editName,
    setEditName,
    togglePhotoSelection,
    selectAllPhotos,
    clearAllPhotos,
    shufflePhotos,
    resetOrder,
    deletePhoto,
    startEditingName,
    saveEditedName,
    cancelEdit
  } = photoManager;

  return (
    <Card
      title={`Manage Photos`}
      collapsedTitle={`Manage Photos (${selectedPhotos.length}/${photoOrder.length} selected)`}
      collapsible={true}
      defaultExpanded={true}
      icon={<Image className="w-5 h-5" />}
    >
      {/* Action Buttons */}
      <div className="mb-4">
        {/* Desktop Layout (md and up) */}
        <div className="hidden md:flex space-x-2">
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={shufflePhotos}
          >
            <Shuffle className="w-4 h-4 mr-1  justify-self-center" />
            <span className="col-span-2"> Shuffle Order</span>           
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={resetOrder}
          >
            Reset Order
          </Button>
          <Button size="sm" variant="secondary" onClick={selectAllPhotos}>
            Select All
          </Button>
          <Button size="sm" variant="danger" onClick={clearAllPhotos} className="self-start sm:self-auto flex-shrink-0 flex items-center">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>

        {/* Mobile Layout (below md) */}
        <div className="md:hidden flex flex-wrap gap-2">
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={shufflePhotos}
            className="flex-1 min-w-[120px]"
          >
            <Shuffle className="w-4 h-4 mr-2 justify-self-center" />
            <span className="hidden xs:inline">Shuffle Order</span>
            <span className="xs:hidden">Shuffle</span>
          </Button>
          
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={resetOrder}
            className="flex-1 min-w-[100px]"
          >
            <span className="hidden xs:inline">Reset Order</span>
            <span className="xs:hidden">Reset</span>
          </Button>
          
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={selectAllPhotos}
            className="flex-1 min-w-[90px]"
          >
            <span className="hidden xs:inline">Select All</span>
            <span className="xs:hidden">All</span>
          </Button>
          
          <Button 
            size="sm" 
            variant="danger" 
            onClick={clearAllPhotos}
            className="flex-1 min-w-[90px]"
          >
            <Trash2 className="w-4 h-4 mr-2 justify-self-center" />
            <span className="hidden xs:inline">Clear All</span>
            <span className="xs:hidden">Clear</span>
          </Button>
        </div>
      </div>
      
      {/* Shuffle Message */}
      {shuffleMessage && (
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-4">
          <p className="text-blue-400 text-sm text-center font-medium">{shuffleMessage}</p>
        </div>
      )}
      
      {/* Quick Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
        <p className="text-blue-300 text-sm">
          <strong>Quick Guide:</strong> Click ✓ to select • ✏️ to edit names • 🗑️ to delete • Drag to reorder
        </p>
      </div>
      
      {/* Game Preview - Simplified */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 mb-4">
        <p className="text-purple-400 text-sm text-center">
          🎮 <strong>{photoOrder.filter(photo => selectedPhotos.includes(photo.id)).length}</strong> photos will appear in game order
        </p>
      </div>
      
      {/* Photo Grid - Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {photoOrder.map((photo, index) => (
          <div 
            key={photo.id}
            className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
              selectedPhotos.includes(photo.id)
                ? 'border-purple-400 ring-2 ring-purple-400/50'
                : 'border-white/20 hover:border-purple-400/50 opacity-50'
            }`}
          >
            {/* Order Number */}
            {selectedPhotos.includes(photo.id) && (
              <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-purple-600 text-white text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full z-10">
                #{photoOrder.filter((p, i) => i <= index && selectedPhotos.includes(p.id)).length}
              </div>
            )}

            <img 
              src={photo.url} 
              alt={`Baby photo of ${photo.person}`}
              className={`w-full h-24 sm:h-32 object-cover transition-all ${
                selectedPhotos.includes(photo.id) ? '' : 'grayscale group-hover:grayscale-0'
              }`}
            />
            
            {/* Action Buttons - Mobile Optimized */}
            <div className="absolute top-1 right-1 sm:top-2 sm:right-2 flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePhotoSelection(photo.id);
                }}
                className={`w-6 h-6 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedPhotos.includes(photo.id)
                    ? 'bg-purple-400 border-purple-400'
                    : 'bg-white/20 border-white/50 hover:border-purple-400'
                }`}
                title={selectedPhotos.includes(photo.id) ? 'Deselect photo' : 'Select photo'}
              >
                {selectedPhotos.includes(photo.id) && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditingName(photo);
                }}
                className="w-6 h-6 rounded-full bg-blue-500/80 hover:bg-blue-500 flex items-center justify-center transition-colors"
                title="Edit name"
              >
                <Edit3 className="w-3 h-3 text-white" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePhoto(photo.id);
                }}
                className="w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-colors"
                title="Delete photo"
              >
                <Trash2 className="w-3 h-3 text-white" />
              </button>
            </div>
            
            {/* Photo Info / Edit Form */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
              {editingPhoto === photo.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-white/10 border border-white/30 rounded text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                    placeholder="Enter name"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') saveEditedName(photo.id);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    autoFocus
                  />
                  <div className="flex space-x-1">
                    <button
                      onClick={() => saveEditedName(photo.id)}
                      className="flex-1 bg-green-500/80 hover:bg-green-500 text-white text-xs py-1 rounded transition-colors flex items-center justify-center"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      <span className="hidden xs:inline">Save</span>
                      <span className="xs:hidden">✓</span>
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-gray-500/80 hover:bg-gray-500 text-white text-xs py-1 rounded transition-colors text-center"
                    >
                      <span className="hidden xs:inline">Cancel</span>
                      <span className="xs:hidden">✕</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-white text-xs font-medium truncate">{photo.person}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {photoOrder.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <Image className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400 mb-2 text-sm sm:text-base">No photos uploaded yet</p>
          <p className="text-gray-500 text-xs sm:text-sm">Photos will appear here when users upload them</p>
        </div>
      )}
    </Card>
  );
};

export default PhotosManager;