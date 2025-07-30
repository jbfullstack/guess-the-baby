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
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Image className="w-5 h-5 text-purple-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">
              Manage Photos ({selectedPhotos.length}/{photoOrder.length} selected)
            </h2>
            <p className="text-sm text-gray-400">Select, edit names, delete photos, and arrange game order</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={shufflePhotos}
            title="Randomize the order that photos will appear in the game"
          >
            <Shuffle className="w-4 h-4 mr-1" />
            Shuffle Order
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={resetOrder}
            title="Reset to original upload order"
          >
            Reset Order
          </Button>
          <Button size="sm" variant="secondary" onClick={selectAllPhotos}>
            Select All
          </Button>
          <Button size="sm" variant="danger" onClick={clearAllPhotos}>
            Clear All
          </Button>
        </div>
      </div>
      
      {/* Shuffle Message */}
      {shuffleMessage && (
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-4">
          <p className="text-blue-400 text-sm text-center font-medium">{shuffleMessage}</p>
        </div>
      )}
      
      {/* Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
        <div className="flex items-start space-x-2">
          <Image className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-blue-400 font-medium mb-1">Photo Management:</p>
            <div className="text-blue-300 space-y-1">
              <p>• <strong>Click checkmark:</strong> Select/deselect for game</p>
              <p>• <strong>Hover & click edit (✏️):</strong> Change person's name</p>
              <p>• <strong>Hover & click delete (🗑️):</strong> Remove photo permanently</p>
              <p>• <strong>Order matters:</strong> #1 will be shown first in the game</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Game Preview */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-4">
        <p className="text-purple-400 text-sm text-center">
          📋 <strong>Game Preview:</strong> Photos will appear in the exact order shown below ({photoOrder.filter(photo => selectedPhotos.includes(photo.id)).length} selected)
        </p>
      </div>
      
      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
              <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                #{photoOrder.filter((p, i) => i <= index && selectedPhotos.includes(p.id)).length}
              </div>
            )}

            <img 
              src={photo.url} 
              alt={`Baby photo of ${photo.person}`}
              className={`w-full h-32 object-cover transition-all ${
                selectedPhotos.includes(photo.id) ? '' : 'grayscale group-hover:grayscale-0'
              }`}
            />
            
            {/* Action Buttons */}
            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePhotoSelection(photo.id);
                }}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
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
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-gray-500/80 hover:bg-gray-500 text-white text-xs py-1 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-white text-xs font-medium">{photo.person}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {photoOrder.length === 0 && (
        <div className="text-center py-12">
          <Image className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400 mb-2">No photos uploaded yet</p>
          <p className="text-gray-500 text-sm">Photos will appear here when users upload them</p>
        </div>
      )}
    </Card>
  );
};

export default PhotosManager;