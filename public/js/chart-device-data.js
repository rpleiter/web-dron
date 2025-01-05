$(document).ready(() => {
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);

  class DeviceData {
    constructor(deviceId) {
      this.deviceId = deviceId;
      this.latitude = null;
      this.longitude = null;
    }

    updateData(latitude, longitude) {
      this.latitude = latitude;
      this.longitude = longitude;
    }
  }

  class TrackedDevices {
    constructor() {
      this.devices = [];
    }

    findDevice(deviceId) {
      return this.devices.find(device => device.deviceId === deviceId);
    }

    getDevicesCount() {
      return this.devices.length;
    }
  }

  const trackedDevices = new TrackedDevices();
  const listOfDevices = document.getElementById('listOfDevices');
  const deviceCount = document.getElementById('deviceCount');

  // Variable para controlar si se debe hacer zoom al seleccionar dispositivo
  let shouldZoom = false;

  // Inicializar el mapa
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error('Map container not found');
    return;
  }

  const map = L.map('map').setView([0, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const markers = {};

  function updateMap(device) {
    // Solo cambiar el zoom si la variable shouldZoom es verdadera
    if (shouldZoom) {
      map.setView([device.latitude, device.longitude], 17); // Ajusta el zoom según sea necesario
    }

    // Actualizar la posición del marcador en el mapa
    if (markers[device.deviceId]) {
      markers[device.deviceId].setLatLng([device.latitude, device.longitude]);
    } else {
      markers[device.deviceId] = L.marker([device.latitude, device.longitude]).addTo(map)
        .bindPopup(device.deviceId);
    }
  }

  function updateDeviceInfo(device) {
    const deviceInfoContainer = document.getElementById('deviceInfo');
    if (deviceInfoContainer) {
      deviceInfoContainer.innerHTML = `
      <p><span class="icon"><i class="fas fa-location-arrow"></i></span><span class="key">Device ID: </span> ${device.deviceId}</p>
      <p><span class="icon"><i class="fas fa-map-marker-alt"></i></span><span class="key">Latitude: </span> ${device.latitude}</p>
      <p><span class="icon"><i class="fas fa-map-marker-alt"></i></span><span class="key">Longitude: </span> ${device.longitude}</p>
      `;
    } else {
      console.error('Device info container not found');
    }
  }

  // Manejar el mensaje WebSocket
  webSocket.onmessage = function(event) {
    try {
      const messageData = JSON.parse(event.data);
      console.log('Received message:', messageData);

      if (!messageData.MessageDate || (!messageData.IotData.Latitude && !messageData.IotData.Longitude)) {
        return;
      }

      let existingDeviceData = trackedDevices.findDevice(messageData.DeviceId);
      let newDevice = false;

      if (existingDeviceData) {
        existingDeviceData.updateData(messageData.IotData.Latitude, messageData.IotData.Longitude);
      } else {
        const newDeviceData = new DeviceData(messageData.DeviceId);
        trackedDevices.devices.push(newDeviceData);
        newDeviceData.updateData(messageData.IotData.Latitude, messageData.IotData.Longitude);
        existingDeviceData = newDeviceData;
        newDevice = true;
      }

      const numDevices = trackedDevices.getDevicesCount();
      deviceCount.innerText = numDevices === 1 ? `${numDevices} device` : `${numDevices} devices`;

      if (newDevice) {
        const option = document.createElement('option');
        option.value = existingDeviceData.deviceId;
        option.textContent = existingDeviceData.deviceId;
        listOfDevices.appendChild(option);
      }

      // Si solo hay un dispositivo, hacer zoom automáticamente
      if (numDevices === 1) {
        shouldZoom = true;
        updateMap(existingDeviceData);  // Esto realizará el zoom en el único dispositivo
        updateDeviceInfo(existingDeviceData);
      } else {
        // No hacer zoom si no es el cambio de selección en el desplegable
        shouldZoom = false;
        updateMap(existingDeviceData);
        updateDeviceInfo(existingDeviceData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Manejar el cambio en el desplegable
  listOfDevices.addEventListener('change', function() {
    const selectedDeviceId = this.value;
    const selectedDevice = trackedDevices.findDevice(selectedDeviceId);
    if (selectedDevice) {
      // Establecer shouldZoom en true solo cuando el usuario cambie la selección
      shouldZoom = true;
      // Actualizar el mapa y la información del dispositivo
      updateMap(selectedDevice);
      updateDeviceInfo(selectedDevice);
    }
  });
});
