// DMC Dashboard Application Logic - Mission BOSS Light Minimal Style

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const schoolSelector = document.getElementById('schoolSelector');
  const levelTabButtons = document.querySelectorAll('.tab-control-btn');
  const tableSearchInput = document.getElementById('tableSearchInput');
  const topSearchInput = document.getElementById('topSearchInput');
  const schoolTableBody = document.getElementById('schoolTableBody');
  const tableHeaders = document.querySelectorAll('#schoolTable th');
  const topSchoolsList = document.getElementById('topSchoolsList');
  const btnExport = document.getElementById('btnExport');
  const btnRefresh = document.getElementById('btnRefresh');
  const btnPresent = document.getElementById('btnPresent');
  const alertsContainer = document.getElementById('alertsContainer');

  // KPI elements (4 cards as per Mission BOSS style)
  const kpiSchoolsVal = document.getElementById('kpi-schools-val');
  const kpiStudentsVal = document.getElementById('kpi-students-val');
  const badgeStudents = document.getElementById('badge-students');
  const kpiRoomsVal = document.getElementById('kpi-rooms-val');
  const badgeRooms = document.getElementById('badge-rooms');
  const kpiDensityVal = document.getElementById('kpi-density-val');
  const badgeDensity = document.getElementById('badge-density');

  // State
  let selectedSchool = 'ALL';
  let selectedLevel = 'ALL'; // 'ALL', 'มต้น', 'มปลาย'
  let searchQuery = '';
  let currentSortKey = 'change';
  let currentSortDir = 'desc';

  // State variables for executive control center
  let chartMetric = 'students'; // 'students', 'rooms', 'density'
  let thresholdDecline = -6.5; // percentage value
  let thresholdDensity = 37.0; // average ratio
  let selectedSchoolSizes = ['S', 'M', 'L', 'XL'];
  let isDarkMode = false;
  let currentPrimaryColor = '#1a73e8';

  // Helper to determine school size based on OBEC standards (2569 total)
  function getSchoolSize(school) {
    const totalStudents = school.y69.total.total;
    if (totalStudents < 120) return 'S';
    if (totalStudents < 500) return 'M';
    if (totalStudents < 1500) return 'L';
    return 'XL';
  }

  // Populate school dropdown dynamically based on selected sizes
  function populateSchoolDropdown() {
    // Clear original options except the first one
    schoolSelector.innerHTML = '<option value="ALL">ภาพรวมทั้งหมด (45 โรงเรียน)</option>';
    
    const filteredSchoolsForDropdown = DASHBOARD_DATA.filter(s => {
      const size = getSchoolSize(s);
      return selectedSchoolSizes.includes(size);
    });
    
    const sortedSchools = [...filteredSchoolsForDropdown].sort((a, b) => a.name.localeCompare(b.name, 'th'));
    sortedSchools.forEach(school => {
      const option = document.createElement('option');
      option.value = school.id;
      option.textContent = school.name;
      if (school.id === selectedSchool) {
        option.selected = true;
      }
      schoolSelector.appendChild(option);
    });

    // Update school count label on option 1
    schoolSelector.firstElementChild.textContent = `ภาพรวมทั้งหมด (${filteredSchoolsForDropdown.length} โรงเรียน)`;
  }

  // Chart instance
  let mainLineChart = null;

  // Initialize
  init();

  function init() {
    // 1. Populate school dropdown
    populateSchoolDropdown();

    // 2. Register Event Listeners
    schoolSelector.addEventListener('change', (e) => {
      selectedSchool = e.target.value;
      updateDashboard();
    });

    levelTabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        levelTabButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        selectedLevel = e.target.dataset.level;
        updateDashboard();
      });
    });

    // Sync search boxes
    tableSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      topSearchInput.value = e.target.value;
      renderTable();
    });

    topSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      tableSearchInput.value = e.target.value;
      renderTable();
    });

    tableHeaders.forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (!key) return;

        if (currentSortKey === key) {
          currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          currentSortKey = key;
          currentSortDir = 'desc';
        }

        tableHeaders.forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
        th.classList.add(currentSortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');

        renderTable();
      });
    });

    btnExport.addEventListener('click', (e) => {
      e.preventDefault();
      window.print();
    });

    btnRefresh.addEventListener('click', (e) => {
      e.preventDefault();
      updateDashboard();
    });

    if (btnPresent) {
      btnPresent.addEventListener('click', (e) => {
        e.preventDefault();
        alert('เริ่มโหมดนำเสนอสำหรับที่ประชุมผู้บริหาร สพม.สกลนคร');
      });
    }

    // 5. Sidebar Menu Click Navigation & Actions
    const menuDashboard = document.getElementById('menuDashboard');
    const menuStudents = document.getElementById('menuStudents');
    const menuClassrooms = document.getElementById('menuClassrooms');
    const menuAnalytics = document.getElementById('menuAnalytics');
    const menuSettings = document.getElementById('menuSettings');

    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');

    const menuItems = [menuDashboard, menuStudents, menuClassrooms, menuAnalytics, menuSettings];

    function setActiveMenu(activeItem) {
      menuItems.forEach(item => {
        if (item) item.classList.remove('active');
      });
      if (activeItem) activeItem.classList.add('active');
    }

    if (menuDashboard) {
      menuDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveMenu(menuDashboard);
        document.getElementById('topSection').scrollIntoView({ behavior: 'smooth' });
      });
    }

    if (menuStudents) {
      menuStudents.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveMenu(menuStudents);
        const panel = document.getElementById('studentsChartPanel');
        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        panel.classList.remove('glow-highlight');
        void panel.offsetWidth; // Trigger reflow
        panel.classList.add('glow-highlight');
        setTimeout(() => panel.classList.remove('glow-highlight'), 1500);
      });
    }

    if (menuClassrooms) {
      menuClassrooms.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveMenu(menuClassrooms);
        const panel = document.getElementById('kpiCardRooms');
        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        const kpiRooms = document.getElementById('kpiCardRooms');
        const kpiDensity = document.getElementById('kpiCardDensity');
        
        kpiRooms.classList.remove('glow-highlight');
        kpiDensity.classList.remove('glow-highlight');
        void kpiRooms.offsetWidth; // Trigger reflow
        kpiRooms.classList.add('glow-highlight');
        kpiDensity.classList.add('glow-highlight');
        setTimeout(() => {
          kpiRooms.classList.remove('glow-highlight');
          kpiDensity.classList.remove('glow-highlight');
        }, 1500);
      });
    }

    if (menuAnalytics) {
      menuAnalytics.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveMenu(menuAnalytics);
        const panel = document.getElementById('tableSection');
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        panel.classList.remove('glow-highlight');
        void panel.offsetWidth;
        panel.classList.add('glow-highlight');
        setTimeout(() => panel.classList.remove('glow-highlight'), 1500);
      });
    }

    // Modal open
    if (menuSettings && settingsModal) {
      menuSettings.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveMenu(menuSettings);
        settingsModal.style.display = 'flex';
      });
    }

    // Modal close
    if (closeSettingsBtn && settingsModal) {
      closeSettingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
        setActiveMenu(menuDashboard); // Return to default dashboard item
      });
      
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
          settingsModal.style.display = 'none';
          setActiveMenu(menuDashboard);
        }
      });
    }

    // Settings logic: Theme Accent Colors
    const colorDots = document.querySelectorAll('.color-dot');
    colorDots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        colorDots.forEach(d => d.classList.remove('active'));
        e.target.classList.add('active');
        
        const color = e.target.dataset.color;
        let primaryColor = '#1a73e8'; // default blue
        let primaryHover = '#1557b0';
        let primaryLight = '#e8f0fe';

        if (color === 'green') {
          primaryColor = '#137333';
          primaryHover = '#0f5b28';
          primaryLight = '#e6f4ea';
        } else if (color === 'red') {
          primaryColor = '#c5221f';
          primaryHover = '#a11b19';
          primaryLight = '#fce8e6';
        } else if (color === 'orange') {
          primaryColor = '#b06000';
          primaryHover = '#8a4b00';
          primaryLight = '#fef7e0';
        } else if (color === 'purple') {
          primaryColor = '#7627cf';
          primaryHover = '#5c1ea3';
          primaryLight = '#f3e8ff';
        }

        // Apply dynamically to CSS variables root
        document.documentElement.style.setProperty('--color-primary', primaryColor);
        document.documentElement.style.setProperty('--color-primary-hover', primaryHover);
        document.documentElement.style.setProperty('--color-primary-light', primaryLight);
        
        currentPrimaryColor = primaryColor; // Save to state

        // Update charts to reflect primary accent color change!
        if (mainLineChart) {
          const ctx = document.getElementById('mainLineChart').getContext('2d');
          const gradient69 = ctx.createLinearGradient(0, 0, 0, 260);
          gradient69.addColorStop(0, primaryColor + '2e'); // ~18% opacity in hex
          gradient69.addColorStop(1, primaryColor + '00');
          
          mainLineChart.data.datasets[0].borderColor = primaryColor;
          mainLineChart.data.datasets[0].pointBackgroundColor = primaryColor;
          mainLineChart.data.datasets[0].backgroundColor = gradient69;
          mainLineChart.update();
        }
      });
    });

    // Settings logic: Toggle Gridlines
    const settingGridlines = document.getElementById('settingGridlines');
    if (settingGridlines) {
      settingGridlines.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        if (mainLineChart) {
          mainLineChart.options.scales.x.grid.display = isChecked;
          mainLineChart.options.scales.y.grid.display = isChecked;
          mainLineChart.update();
        }
      });
    }

    // Settings logic: Toggle Alert Box
    const settingAlertBox = document.getElementById('settingAlertBox');
    const alertBox = document.getElementById('alertBox');
    if (settingAlertBox && alertBox) {
      settingAlertBox.addEventListener('change', (e) => {
        alertBox.style.display = e.target.checked ? 'flex' : 'none';
      });
    }

    // 1. Chart Metric Selector listener
    const settingChartMetric = document.getElementById('settingChartMetric');
    if (settingChartMetric) {
      settingChartMetric.addEventListener('change', (e) => {
        chartMetric = e.target.value;
        updateDashboard();
      });
    }

    // 2. Decline Threshold range slider listener
    const settingDeclineThreshold = document.getElementById('settingDeclineThreshold');
    const labelDeclineThreshold = document.getElementById('labelDeclineThreshold');
    if (settingDeclineThreshold && labelDeclineThreshold) {
      settingDeclineThreshold.addEventListener('input', (e) => {
        thresholdDecline = -parseFloat(e.target.value);
        labelDeclineThreshold.textContent = `${thresholdDecline.toFixed(1)}%`;
        const stats = getFilteredStats();
        renderAlerts(stats);
        renderTable();
      });
    }

    // 3. Density Threshold range slider listener
    const settingDensityThreshold = document.getElementById('settingDensityThreshold');
    const labelDensityThreshold = document.getElementById('labelDensityThreshold');
    if (settingDensityThreshold && labelDensityThreshold) {
      settingDensityThreshold.addEventListener('input', (e) => {
        thresholdDensity = parseInt(e.target.value);
        labelDensityThreshold.textContent = `${thresholdDensity.toFixed(1)} คน/ห้อง`;
        const stats = getFilteredStats();
        renderAlerts(stats);
        renderTable();
      });
    }

    // 4. School Size Checkboxes listeners
    const settingSchoolSizes = document.querySelectorAll('.setting-school-size');
    settingSchoolSizes.forEach(cb => {
      cb.addEventListener('change', () => {
        selectedSchoolSizes = Array.from(settingSchoolSizes)
          .filter(c => c.checked)
          .map(c => c.value);
        
        populateSchoolDropdown();
        updateDashboard();
      });
    });

    // 5. Dark Mode Toggle listener
    const settingDarkMode = document.getElementById('settingDarkMode');
    if (settingDarkMode) {
      settingDarkMode.addEventListener('change', (e) => {
        isDarkMode = e.target.checked;
        if (isDarkMode) {
          document.body.classList.add('dark-theme');
        } else {
          document.body.classList.remove('dark-theme');
        }
        // Force redraw line chart to adapt colors
        const stats = getFilteredStats();
        renderLineChart(stats);
      });
    }

    // Default sorting column
    document.querySelector('th[data-sort="change"]').classList.add('sorted-desc');

    // Responsive Mobile Sidebar Toggle
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    if (menuToggleBtn && sidebar && sidebarBackdrop) {
      menuToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sidebar.classList.toggle('open');
        sidebarBackdrop.classList.toggle('active');
      });

      sidebarBackdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('active');
      });

      // Close sidebar drawer after navigating on mobile
      const navLinks = document.querySelectorAll('.nav-menu a');
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          sidebar.classList.remove('open');
          sidebarBackdrop.classList.remove('active');
        });
      });
    }

    updateDashboard();
  }

  // Calculate filtered stats
  function getFilteredStats() {
    let filteredSchools = DASHBOARD_DATA;
    
    // Filter schools by size
    filteredSchools = filteredSchools.filter(s => {
      const size = getSchoolSize(s);
      return selectedSchoolSizes.includes(size);
    });

    if (selectedSchool !== 'ALL') {
      filteredSchools = DASHBOARD_DATA.filter(s => s.id === selectedSchool);
    }

    let stats = {
      68: { 
        students: 0, rooms: 0, male: 0, female: 0, 
        grades: { ม1: 0, ม2: 0, ม3: 0, ม4: 0, ม5: 0, ม6: 0 },
        roomsGrades: { ม1: 0, ม2: 0, ม3: 0, ม4: 0, ม5: 0, ม6: 0 }
      },
      69: { 
        students: 0, rooms: 0, male: 0, female: 0, 
        grades: { ม1: 0, ม2: 0, ม3: 0, ม4: 0, ม5: 0, ม6: 0 },
        roomsGrades: { ม1: 0, ม2: 0, ม3: 0, ม4: 0, ม5: 0, ม6: 0 }
      }
    };

    filteredSchools.forEach(sch => {
      // 2568
      if (selectedLevel === 'ALL') {
        stats[68].students += sch.y68.total.total;
        stats[68].rooms += sch.y68.total.rooms;
        stats[68].male += sch.y68.total.m;
        stats[68].female += sch.y68.total.f;
      } else {
        const lvlData = sch.y68.levels[selectedLevel];
        stats[68].students += lvlData.total;
        stats[68].rooms += lvlData.rooms;
        stats[68].male += lvlData.m;
        stats[68].female += lvlData.f;
      }
      
      for (let i = 1; i <= 6; i++) {
        stats[68].grades[`ม${i}`] += sch.y68.grades[`ม${i}`].total;
        stats[68].roomsGrades[`ม${i}`] += sch.y68.grades[`ม${i}`].rooms;
      }

      // 2569
      if (selectedLevel === 'ALL') {
        stats[69].students += sch.y69.total.total;
        stats[69].rooms += sch.y69.total.rooms;
        stats[69].male += sch.y69.total.m;
        stats[69].female += sch.y69.total.f;
      } else {
        const lvlData = sch.y69.levels[selectedLevel];
        stats[69].students += lvlData.total;
        stats[69].rooms += lvlData.rooms;
        stats[69].male += lvlData.m;
        stats[69].female += lvlData.f;
      }

      for (let i = 1; i <= 6; i++) {
        stats[69].grades[`ม${i}`] += sch.y69.grades[`ม${i}`].total;
        stats[69].roomsGrades[`ม${i}`] += sch.y69.grades[`ม${i}`].rooms;
      }
    });

    return stats;
  }

  // Update dashboard components
  function updateDashboard() {
    const stats = getFilteredStats();
    
    updateKPIs(stats);
    renderLineChart(stats);
    renderTopSchools();
    renderAlerts(stats);
    renderTable();
  }

  function updateKPIs(stats) {
    // School Count Card
    const totalSchoolsCount = selectedSchool === 'ALL' ? DASHBOARD_DATA.length : 1;
    kpiSchoolsVal.textContent = totalSchoolsCount;

    // Students Card
    const std69 = stats[69].students;
    const std68 = stats[68].students;
    const stdDiff = std69 - std68;
    const stdPct = std68 > 0 ? (stdDiff / std68) * 100 : 0;
    
    kpiStudentsVal.textContent = std69.toLocaleString();
    updateBadge(badgeStudents, stdPct, true);

    // Rooms Card
    const rms69 = stats[69].rooms;
    const rms68 = stats[68].rooms;
    const rmsDiff = rms69 - rms68;
    const rmsPct = rms68 > 0 ? (rmsDiff / rms68) * 100 : 0;
    
    kpiRoomsVal.textContent = rms69.toLocaleString();
    updateBadge(badgeRooms, rmsPct, true);

    // Density Card (Students/Room Ratio)
    const ratio69 = rms69 > 0 ? std69 / rms69 : 0;
    const ratio68 = rms68 > 0 ? std68 / rms68 : 0;
    const ratioDiff = ratio69 - ratio68;

    kpiDensityVal.textContent = ratio69.toFixed(1);
    
    // Decreasing density is positive (less crowded), increasing is negative (more crowded)
    updateBadge(badgeDensity, ratioDiff, false, true); 
  }

  // Helper to update trend badges
  function updateBadge(badgeElement, val, isPercentage = true, reversePolarity = false) {
    badgeElement.classList.remove('positive', 'negative', 'stable');
    
    const displayVal = isPercentage ? `${val >= 0 ? '+' : ''}${val.toFixed(1)}%` : `${val >= 0 ? '+' : ''}${val.toFixed(1)}`;
    
    if (val > 0) {
      badgeElement.classList.add(reversePolarity ? 'negative' : 'positive');
      badgeElement.innerHTML = val > 0 && !reversePolarity ? `↗ ${displayVal}` : `▲ ${displayVal}`;
    } else if (val < 0) {
      badgeElement.classList.add(reversePolarity ? 'positive' : 'negative');
      badgeElement.innerHTML = val < 0 && reversePolarity ? `↘ ${displayVal}` : `▼ ${displayVal}`;
    } else {
      badgeElement.classList.add('stable');
      badgeElement.innerHTML = `Stable`;
    }
  }

  // Render Line Area Chart (Mission BOSS Light Minimal style)
  function renderLineChart(stats) {
    const isDarkTheme = document.body.classList.contains('dark-theme');
    const gridColor = isDarkTheme ? '#3c4043' : '#eef1f6'; 
    const textColor = isDarkTheme ? '#9aa0a6' : '#5f6368'; 

    let labels = [];
    let data68 = [];
    let data69 = [];
    let metricLabel = 'คน';

    if (chartMetric === 'students') {
      metricLabel = 'คน';
      if (selectedLevel === 'ALL') {
        labels = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
        data68 = [stats[68].grades.ม1, stats[68].grades.ม2, stats[68].grades.ม3, stats[68].grades.ม4, stats[68].grades.ม5, stats[68].grades.ม6];
        data69 = [stats[69].grades.ม1, stats[69].grades.ม2, stats[69].grades.ม3, stats[69].grades.ม4, stats[69].grades.ม5, stats[69].grades.ม6];
      } else if (selectedLevel === 'มต้น') {
        labels = ['ม.1', 'ม.2', 'ม.3'];
        data68 = [stats[68].grades.ม1, stats[68].grades.ม2, stats[68].grades.ม3];
        data69 = [stats[69].grades.ม1, stats[69].grades.ม2, stats[69].grades.ม3];
      } else if (selectedLevel === 'มปลาย') {
        labels = ['ม.4', 'ม.5', 'ม.6'];
        data68 = [stats[68].grades.ม4, stats[68].grades.ม5, stats[68].grades.ม6];
        data69 = [stats[69].grades.ม4, stats[69].grades.ม5, stats[69].grades.ม6];
      }
    } else if (chartMetric === 'rooms') {
      metricLabel = 'ห้อง';
      if (selectedLevel === 'ALL') {
        labels = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
        data68 = [stats[68].roomsGrades.ม1, stats[68].roomsGrades.ม2, stats[68].roomsGrades.ม3, stats[68].roomsGrades.ม4, stats[68].roomsGrades.ม5, stats[68].roomsGrades.ม6];
        data69 = [stats[69].roomsGrades.ม1, stats[69].roomsGrades.ม2, stats[69].roomsGrades.ม3, stats[69].roomsGrades.ม4, stats[69].roomsGrades.ม5, stats[69].roomsGrades.ม6];
      } else if (selectedLevel === 'มต้น') {
        labels = ['ม.1', 'ม.2', 'ม.3'];
        data68 = [stats[68].roomsGrades.ม1, stats[68].roomsGrades.ม2, stats[68].roomsGrades.ม3];
        data69 = [stats[69].roomsGrades.ม1, stats[69].roomsGrades.ม2, stats[69].roomsGrades.ม3];
      } else if (selectedLevel === 'มปลาย') {
        labels = ['ม.4', 'ม.5', 'ม.6'];
        data68 = [stats[68].roomsGrades.ม4, stats[68].roomsGrades.ม5, stats[68].roomsGrades.ม6];
        data69 = [stats[69].roomsGrades.ม4, stats[69].roomsGrades.ม5, stats[69].roomsGrades.ม6];
      }
    } else if (chartMetric === 'density') {
      metricLabel = 'คน/ห้อง';
      const calculateDensityArray = (y) => {
        const getRatio = (std, rms) => rms > 0 ? std / rms : 0;
        if (selectedLevel === 'ALL') {
          return [
            getRatio(stats[y].grades.ม1, stats[y].roomsGrades.ม1),
            getRatio(stats[y].grades.ม2, stats[y].roomsGrades.ม2),
            getRatio(stats[y].grades.ม3, stats[y].roomsGrades.ม3),
            getRatio(stats[y].grades.ม4, stats[y].roomsGrades.ม4),
            getRatio(stats[y].grades.ม5, stats[y].roomsGrades.ม5),
            getRatio(stats[y].grades.ม6, stats[y].roomsGrades.ม6)
          ];
        } else if (selectedLevel === 'มต้น') {
          return [
            getRatio(stats[y].grades.ม1, stats[y].roomsGrades.ม1),
            getRatio(stats[y].grades.ม2, stats[y].roomsGrades.ม2),
            getRatio(stats[y].grades.ม3, stats[y].roomsGrades.ม3)
          ];
        } else {
          return [
            getRatio(stats[y].grades.ม4, stats[y].roomsGrades.ม4),
            getRatio(stats[y].grades.ม5, stats[y].roomsGrades.ม5),
            getRatio(stats[y].grades.ม6, stats[y].roomsGrades.ม6)
          ];
        }
      };
      labels = selectedLevel === 'ALL' ? ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'] : (selectedLevel === 'มต้น' ? ['ม.1', 'ม.2', 'ม.3'] : ['ม.4', 'ม.5', 'ม.6']);
      data68 = calculateDensityArray(68);
      data69 = calculateDensityArray(69);
    }

    if (mainLineChart) {
      mainLineChart.destroy();
    }

    const ctx = document.getElementById('mainLineChart').getContext('2d');
    
    // Create clean dynamic area gradient using current primary color
    const gradient69 = ctx.createLinearGradient(0, 0, 0, 260);
    gradient69.addColorStop(0, currentPrimaryColor + '2e'); 
    gradient69.addColorStop(1, currentPrimaryColor + '00');

    const gradient68 = ctx.createLinearGradient(0, 0, 0, 260);
    gradient68.addColorStop(0, 'rgba(152, 152, 157, 0.08)');
    gradient68.addColorStop(1, 'rgba(152, 152, 157, 0.00)');

    const isGridChecked = document.getElementById('settingGridlines') ? document.getElementById('settingGridlines').checked : true;

    mainLineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'ปีการศึกษา 2569',
            data: data69,
            borderColor: currentPrimaryColor,
            borderWidth: 2.5,
            backgroundColor: gradient69,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: currentPrimaryColor,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            pointHoverBorderWidth: 3,
          },
          {
            label: 'ปีการศึกษา 2568',
            data: data68,
            borderColor: '#98989d',
            borderWidth: 1.5,
            borderDash: [5, 5],
            backgroundColor: gradient68,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: '#98989d',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
            pointHoverRadius: 5,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDarkTheme ? '#1e1f22' : '#ffffff',
            titleColor: isDarkTheme ? '#f1f3f4' : '#202124',
            bodyColor: isDarkTheme ? '#f1f3f4' : '#202124',
            borderColor: isDarkTheme ? '#3c4043' : '#dadce0',
            borderWidth: 1,
            padding: 12,
            titleFont: { family: 'Google Sans, Sarabun', size: 13, weight: 'bold' },
            bodyFont: { family: 'Google Sans, Sarabun', size: 12 },
            callbacks: {
              label: function(context) {
                return ` ${context.dataset.label}: ${context.parsed.y.toLocaleString(undefined, {maximumFractionDigits: 1})} ${metricLabel}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              font: { family: 'Google Sans, Sarabun', size: 12 }
            }
          },
          y: {
            grid: { color: gridColor, display: isGridChecked },
            ticks: {
              color: textColor,
              font: { family: 'Google Sans, Sarabun', size: 11 }
            }
          }
        }
      }
    });
  }

  // Render Top 5 Schools progress bars (Asset list style)
  function renderTopSchools() {
    // Filter schools by size
    let filteredListForTop = DASHBOARD_DATA.filter(s => {
      const size = getSchoolSize(s);
      return selectedSchoolSizes.includes(size);
    });

    let schoolList = filteredListForTop.map(school => {
      let count = 0;
      if (selectedLevel === 'ALL') {
        count = school.y69.total.total;
      } else {
        count = school.y69.levels[selectedLevel].total;
      }
      return {
        name: school.name,
        count: count
      };
    });

    schoolList.sort((a, b) => b.count - a.count);
    const top5 = schoolList.slice(0, 5);
    const maxVal = top5.length > 0 ? top5[0].count : 1;

    topSchoolsList.innerHTML = '';
    top5.forEach(sch => {
      const percentage = (sch.count / maxVal) * 100;
      
      const itemHTML = `
        <div class="progress-item">
          <div class="progress-meta">
            <span class="progress-name" title="${sch.name}">${sch.name}</span>
            <span class="progress-val">${sch.count.toLocaleString()} คน</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
      topSchoolsList.insertAdjacentHTML('beforeend', itemHTML);
    });
  }

  // Render warnings/insights for the alerts panel
  function renderAlerts(stats) {
    alertsContainer.innerHTML = '';
    let alerts = [];

    // Filter schools to only current visible sizes
    let activeSchools = DASHBOARD_DATA.filter(s => {
      const size = getSchoolSize(s);
      return selectedSchoolSizes.includes(size);
    });

    if (selectedSchool === 'ALL') {
      // 1. Find schools with severe student drop (exceeding thresholdDecline)
      const decliningSchools = activeSchools.map(s => {
        let std68 = selectedLevel === 'ALL' ? s.y68.total.total : s.y68.levels[selectedLevel].total;
        let std69 = selectedLevel === 'ALL' ? s.y69.total.total : s.y69.levels[selectedLevel].total;
        let diff = std69 - std68;
        let pct = std68 > 0 ? (diff / std68) * 100 : 0;
        return { name: s.name, pct: pct, diff: diff };
      })
      .filter(s => s.pct < thresholdDecline)
      .sort((a, b) => a.pct - b.pct);

      if (decliningSchools.length > 0) {
        const schoolNames = decliningSchools.slice(0, 3).map(s => `${s.name} (${s.pct.toFixed(1)}%)`);
        alerts.push(`<div class="alert-item">⚠️ **นักเรียนลดลงวิกฤต** (เกินเกณฑ์ ${thresholdDecline.toFixed(1)}%): ${schoolNames.join(', ')} ${decliningSchools.length > 3 ? `และโรงเรียนอื่นอีก ${decliningSchools.length - 3} แห่ง` : ''}</div>`);
      }

      // 2. Find schools with high classroom density (exceeding thresholdDensity)
      const denseSchools = activeSchools.map(s => {
        let std69 = selectedLevel === 'ALL' ? s.y69.total.total : s.y69.levels[selectedLevel].total;
        let room69 = selectedLevel === 'ALL' ? s.y69.total.rooms : s.y69.levels[selectedLevel].rooms;
        let ratio = room69 > 0 ? std69 / room69 : 0;
        return { name: s.name, ratio: ratio };
      })
      .filter(s => s.ratio > thresholdDensity)
      .sort((a, b) => b.ratio - a.ratio);

      if (denseSchools.length > 0) {
        const schoolNames = denseSchools.slice(0, 3).map(s => `${s.name} (${s.ratio.toFixed(1)} คน/ห้อง)`);
        alerts.push(`<div class="alert-item">⚠️ **ห้องเรียนแออัดวิกฤต** (เกินเกณฑ์ ${thresholdDensity} คน/ห้อง): ${schoolNames.join(', ')} ${denseSchools.length > 3 ? `และโรงเรียนอื่นอีก ${denseSchools.length - 3} แห่ง` : ''}</div>`);
      }

      // 3. Positive stats
      const growingCount = activeSchools.filter(s => {
        let std68 = selectedLevel === 'ALL' ? s.y68.total.total : s.y68.levels[selectedLevel].total;
        let std69 = selectedLevel === 'ALL' ? s.y69.total.total : s.y69.levels[selectedLevel].total;
        return std69 > std68;
      }).length;
      if (activeSchools.length > 0) {
        alerts.push(`<div class="alert-item" style="color:var(--color-success)">🟢 **อัตราการเติบโตบวก**: มีโรงเรียน ${growingCount} แห่งในกลุ่มนี้ที่มีแนวโน้มจำนวนนักเรียนเพิ่มขึ้นในปี 2569</div>`);
      }

    } else {
      // Alerts for a single school
      const school = DASHBOARD_DATA.find(s => s.id === selectedSchool);
      let std68 = selectedLevel === 'ALL' ? school.y68.total.total : school.y68.levels[selectedLevel].total;
      let std69 = selectedLevel === 'ALL' ? school.y69.total.total : school.y69.levels[selectedLevel].total;
      let room69 = selectedLevel === 'ALL' ? school.y69.total.rooms : school.y69.levels[selectedLevel].rooms;
      
      let diff = std69 - std68;
      let pct = std68 > 0 ? (diff / std68) * 100 : 0;
      let ratio = room69 > 0 ? std69 / room69 : 0;

      if (pct < thresholdDecline) {
        alerts.push(`<div class="alert-item">⚠️ **อัตรานักเรียนลดวิกฤต**: ยอดนักเรียนลดลง ${Math.abs(diff)} คน (${pct.toFixed(1)}%) เกินเกณฑ์เฉลี่ยวิกฤต</div>`);
      }
      if (ratio > thresholdDensity) {
        alerts.push(`<div class="alert-item">⚠️ **ความแออัดเฉลี่ยสูงวิกฤต**: เฉลี่ย ${ratio.toFixed(1)} คน/ห้อง เกินเกณฑ์ ${thresholdDensity} คน/ห้อง</div>`);
      } else if (ratio < 20.0 && ratio > 0) {
        alerts.push(`<div class="alert-item" style="color:var(--color-success)">🟢 **สัดส่วนห้องเรียนดีเยี่ยม**: เฉลี่ย ${ratio.toFixed(1)} คน/ห้อง จัดอยู่ในเกณฑ์ดูแลนักเรียนได้อย่างทั่วถึง</div>`);
      }
      
      if (alerts.length === 0) {
        alerts.push(`<div class="alert-item" style="color:var(--color-success)">🟢 ดัชนีความหนาแน่นและยอดรวมนักเรียนอยู่ในเกณฑ์ปกติเรียบร้อยดี</div>`);
      }
    }

    alertsContainer.innerHTML = alerts.join('<div style="height: 8px;"></div>');
  }

  // Render comparative table
  function renderTable() {
    // Filter by school sizes
    const filteredSchoolsForTable = DASHBOARD_DATA.filter(s => {
      const size = getSchoolSize(s);
      return selectedSchoolSizes.includes(size);
    });

    let records = filteredSchoolsForTable.map((school, index) => {
      let std68 = 0, room68 = 0;
      let std69 = 0, room69 = 0;

      if (selectedLevel === 'ALL') {
        std68 = school.y68.total.total;
        room68 = school.y68.total.rooms;
        std69 = school.y69.total.total;
        room69 = school.y69.total.rooms;
      } else {
        std68 = school.y68.levels[selectedLevel].total;
        room68 = school.y68.levels[selectedLevel].rooms;
        std69 = school.y69.levels[selectedLevel].total;
        room69 = school.y69.levels[selectedLevel].rooms;
      }

      const diff = std69 - std68;
      const change = std68 > 0 ? (diff / std68) * 100 : 0;
      const ratio68 = room68 > 0 ? std68 / room68 : 0;
      const ratio69 = room69 > 0 ? std69 / room69 : 0;

      return {
        id: school.id,
        name: school.name,
        std68,
        std69,
        change,
        diff,
        room68,
        room69,
        ratio68,
        ratio69,
        originalIndex: index + 1
      };
    });

    if (searchQuery) {
      records = records.filter(r => r.name.toLowerCase().includes(searchQuery));
    }

    records.sort((a, b) => {
      let valA = a[currentSortKey];
      let valB = b[currentSortKey];

      if (currentSortKey === 'name') {
        return currentSortDir === 'asc' 
          ? valA.localeCompare(valB, 'th') 
          : valB.localeCompare(valA, 'th');
      }

      if (currentSortDir === 'asc') {
        return valA - valB;
      } else {
        return valB - valA;
      }
    });

    schoolTableBody.innerHTML = '';
    
    if (records.length === 0) {
      schoolTableBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; color: var(--text-muted); padding: 30px;">
            ไม่พบข้อมูลโรงเรียนที่ค้นหา
          </td>
        </tr>
      `;
      return;
    }

    records.forEach((rec, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.id = rec.id;
      
      if (selectedSchool !== 'ALL' && rec.id === selectedSchool) {
        tr.style.backgroundColor = 'var(--color-primary-light)';
        tr.style.fontWeight = '500';
      }

      let badgeClass = 'neutral';
      let changeText = '0.0%';
      if (rec.diff > 0) {
        badgeClass = 'positive';
        changeText = `+${rec.diff} คน (+${rec.change.toFixed(1)}%)`;
      } else if (rec.diff < 0) {
        badgeClass = 'negative';
        changeText = `${rec.diff} คน (${rec.change.toFixed(1)}%)`;
      } else {
        changeText = 'คงที่ (0%)';
      }

      let warningIndicator = '';
      if (rec.change < thresholdDecline || rec.ratio69 > thresholdDensity) {
        warningIndicator = `<span style="color: var(--color-error); font-weight: bold; font-size: 13px; margin-right: 4px;" title="วิกฤตความหนาแน่นหรืออัตรานักเรียนลดลง">⚠️</span>`;
      }

      tr.innerHTML = `
        <td class="col-toggle" style="text-align: center; vertical-align: middle;">
          <button class="row-toggle-btn" data-id="${rec.id}">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </td>
        <td class="col-seq" style="color: var(--text-muted)">${idx + 1}</td>
        <td class="col-name">
          <div style="display: flex; align-items: center;">
            ${warningIndicator}
            <a href="#" class="table-school-link" data-id="${rec.id}">
              ${rec.name}
            </a>
          </div>
        </td>
        <td class="col-std68">${rec.std68.toLocaleString()}</td>
        <td class="col-std69">${rec.std69.toLocaleString()}</td>
        <td class="col-change">
          <span class="table-change-badge ${badgeClass}">${changeText}</span>
        </td>
        <td class="col-room68">${rec.room68}</td>
        <td class="col-room69">${rec.room69}</td>
        <td class="col-ratio68" style="color: var(--text-muted)">${rec.ratio68.toFixed(1)}</td>
        <td class="col-ratio69" style="font-weight: 700; color: var(--text-main);">${rec.ratio69.toFixed(1)}</td>
      `;

      schoolTableBody.appendChild(tr);
    });

    // Toggle details row on mobile & tablet
    document.querySelectorAll('.row-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tr = btn.closest('tr');
        const nextTr = tr.nextElementSibling;
        
        if (nextTr && nextTr.classList.contains('child-row')) {
          // If already open, close it
          nextTr.remove();
          tr.classList.remove('expanded');
          btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          `;
        } else {
          // Open it: render the hidden columns
          tr.classList.add('expanded');
          btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          `;
          
          const recId = btn.dataset.id;
          const rec = records.find(r => r.id === recId);
          
          const isMobile = window.innerWidth <= 768;
          const colspan = isMobile ? 5 : 6;
          
          const childTr = document.createElement('tr');
          childTr.classList.add('child-row');
          
          let detailsHTML = '<div class="child-details-wrapper">';
          
          // On mobile (<768px), show std68 in detail
          if (isMobile) {
            detailsHTML += `
              <div class="child-detail-item">
                <span class="detail-label">นักเรียน 2568:</span>
                <span class="detail-val">${rec.std68.toLocaleString()} คน</span>
              </div>
            `;
          }
          
          // Hidden on both tablet & mobile
          detailsHTML += `
            <div class="child-detail-item">
              <span class="detail-label">ห้องเรียน 2568:</span>
              <span class="detail-val">${rec.room68} ห้อง</span>
            </div>
            <div class="child-detail-item">
              <span class="detail-label">ห้องเรียน 2569:</span>
              <span class="detail-val">${rec.room69} ห้อง</span>
            </div>
            <div class="child-detail-item">
              <span class="detail-label">นร./ห้อง 2568:</span>
              <span class="detail-val">${rec.ratio68.toFixed(1)} คน/ห้อง</span>
            </div>
            <div class="child-detail-item">
              <span class="detail-label">นร./ห้อง 2569:</span>
              <span class="detail-val" style="font-weight: 700;">${rec.ratio69.toFixed(1)} คน/ห้อง</span>
            </div>
          `;
          
          detailsHTML += '</div>';
          
          childTr.innerHTML = `
            <td colspan="${colspan}">
              ${detailsHTML}
            </td>
          `;
          
          tr.after(childTr);
        }
      });
    });

    document.querySelectorAll('.table-school-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const schoolId = link.dataset.id;
        schoolSelector.value = schoolId;
        selectedSchool = schoolId;
        updateDashboard();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

});
