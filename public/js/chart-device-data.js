$(document).ready(() => {
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);

  class DeviceData {
    constructor(deviceId) {
      this.deviceId = deviceId;
      this.latitude = null;
      this.longitude = null;
      this.energy = null;
      this.speed = null;
      this.height = null;
    }

    updateData(latitude, longitude, energy, speed, height) {
      this.latitude = latitude;
      this.longitude = longitude;
      this.energy = energy;
      this.speed = speed;
      this.height = height;
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
    if (shouldZoom) {
      map.setView([device.latitude, device.longitude], 17);
    }

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
        <p><span class="icon"><i class="fas fa-battery-three-quarters"></i></span><span class="key">Energy: </span> ${device.energy}</p>
        <p><span class="icon"><i class="fas fa-tachometer-alt"></i></span><span class="key">Speed: </span> ${device.speed}</p>
        <p><span class="icon"><i class="fas fa-arrows-alt-v"></i></span><span class="key">Height: </span> ${device.height}</p>
      `;
    } else {
      console.error('Device info container not found');
    }
  }

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
        existingDeviceData.updateData(
          messageData.IotData.Latitude,
          messageData.IotData.Longitude,
          messageData.IotData.Energy,
          messageData.IotData.Speed,
          messageData.IotData.Height
        );
      } else {
        const newDeviceData = new DeviceData(messageData.DeviceId);
        trackedDevices.devices.push(newDeviceData);
        newDeviceData.updateData(
          messageData.IotData.Latitude,
          messageData.IotData.Longitude,
          messageData.IotData.Energy,
          messageData.IotData.Speed,
          messageData.IotData.Height
        );
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

      shouldZoom = (numDevices === 1);
      updateMap(existingDeviceData);
      updateDeviceInfo(existingDeviceData);
    } catch (err) {
      console.error(err);
    }
  };

  listOfDevices.addEventListener('change', function() {
    const selectedDeviceId = this.value;
    const selectedDevice = trackedDevices.findDevice(selectedDeviceId);
    if (selectedDevice) {
      shouldZoom = true;
      updateMap(selectedDevice);
      updateDeviceInfo(selectedDevice);
    }
  });
});
