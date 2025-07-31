import React, { useState } from 'react';
import { Camera, Check } from 'lucide-react';
import { useGame } from '../../hooks/useGame';
import Button from '../ui/Button';
import Card from '../ui/Card';

const UploadPage = () => {
  const { gameState, actions } = useGame();
  const [selectedName, setSelectedName] = useState('');
  const [newName, setNewName] = useState('');
  const [showNewNameInput, setShowNewNameInput] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleImageUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async () => {
    const nameToUse = showNewNameInput ? newName.trim() : selectedName;
    
    if (!file || !nameToUse) {
      alert('Please select a photo and choose a name');
      return;
    }

    setUploading(true);
    try {
      const result = await actions.uploadPhoto(file, nameToUse);
      
      if (result.success) {
        setUploadSuccess(true);
        // Reset form after 2 seconds
        setTimeout(() => {
          setUploadSuccess(false);
          setFile(null);
          setUploadedImage(null);
          setSelectedName('');
          setNewName('');
          setShowNewNameInput(false);
        }, 2000);
      } else {
        alert('Upload failed: ' + result.error);
      }
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddNewName = () => {
    if (newName.trim()) {
      setShowNewNameInput(false);
      setSelectedName(newName.trim());
    }
  };

  if (uploadSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <Check className="w-16 h-16 mx-auto mb-4 text-green-400" />
          <h2 className="text-2xl font-bold text-white mb-2">Upload Successful!</h2>
          <p className="text-gray-300">Your baby photo has been added to the game.</p>
        </Card>
      </div>
    );
  }

  // Check if selected name is a new name (not in existing names list)
  const isNewName = selectedName && !gameState.names.includes(selectedName);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Upload Your Baby Photo</h2>
        
        {/* Image Upload Area */}
        <div className="mb-6">
          <label className="block w-full">
            <div className="border-2 border-dashed border-gray-400 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors">
              {uploadedImage ? (
                <div className="space-y-2">
                  <img 
                    src={uploadedImage} 
                    alt="Preview" 
                    className="w-32 h-32 object-cover rounded-lg mx-auto border-2 border-purple-400"
                  />
                  <p className="text-sm text-gray-300">Click to change photo</p>
                </div>
              ) : (
                <>
                  <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-400 mb-1">Click to upload baby photo</p>
                  <p className="text-xs text-gray-500">Max 5MB • JPG, PNG, GIF</p>
                </>
              )}
            </div>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className="hidden" 
            />
          </label>
        </div>

        {/* Name Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Who is in this photo?</h3>
          
          {!showNewNameInput ? (
            <div className="space-y-2">
              {/* Show selected new name if it exists */}
              {isNewName && (
                <div className="mb-3 p-3 bg-purple-500/20 border border-purple-400/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                      <span className="text-white font-medium">{selectedName} (new)</span>
                    </div>
                    <button
                      onClick={() => setSelectedName('')}
                      className="text-gray-400 hover:text-gray-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
              
              {gameState.names.map(name => (
                <label key={name} className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="person"
                    value={name}
                    checked={selectedName === name}
                    onChange={(e) => setSelectedName(e.target.value)}
                    className="w-4 h-4 text-purple-600 bg-transparent border-2 border-gray-400 rounded focus:ring-purple-500"
                  />
                  <span className="text-white group-hover:text-purple-300 transition-colors">{name}</span>
                </label>
              ))}
              
              <button
                onClick={() => setShowNewNameInput(true)}
                className="text-purple-400 hover:text-purple-300 mt-3 text-sm font-medium"
              >
                + Add new person
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter person's name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
                />
                <Button 
                  size="sm" 
                  onClick={handleAddNewName}
                  disabled={!newName.trim()}
                >
                  Add
                </Button>
              </div>
              <button
                onClick={() => {
                  setShowNewNameInput(false);
                  setNewName('');
                }}
                className="text-gray-400 hover:text-gray-300 text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button 
            variant="secondary" 
            onClick={() => actions.setView('home')}
            className="flex-1"
          >
            Back
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!file || !selectedName || uploading}
            className="flex-1"
          >
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </Button>
        </div>

        {/* Upload Tips */}
        <div className="mt-4 text-xs text-gray-400 text-center">
          <p>💡 Tip: Clear, well-lit baby photos work best for the game!</p>
        </div>
      </Card>
    </div>
  );
};

export default UploadPage;