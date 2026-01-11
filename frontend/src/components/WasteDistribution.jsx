import { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import toast from 'react-hot-toast';

const WasteDistribution = () => {
  const defaultIndex = 0; 
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [series, setSeries] = useState([]);
  const [labels, setLabels] = useState([]);
  const [colors, setColors] = useState([]);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("auth_token");

  // Fetch waste distribution data on mount
  useEffect(() => {
    const fetchWasteDistribution = async () => {
      try {

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/waste-distribution`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
             Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to fetch waste distribution data");
        const result = await response.json();

        if (!result.data || result.data.length === 0) {
          throw new Error("No waste distribution data available");
        }

        // Extract data: series (quantities in tons), labels (waste type names), colors
        const fetchedSeries = result.data.map(item => item.total_quantity / 1000); // Convert kg to tons
        const fetchedLabels = result.data.map(item => item.waste_type);
        const fetchedColors = result.data.map((_, index) => {
          const colorPalette = ['#4CAF50', '#00E676', '#2E7D32', '#D4AF37', '#FF5722', '#2196F3'];
          return colorPalette[index % colorPalette.length]; 
        });

        setSeries(fetchedSeries);
        setLabels(fetchedLabels);
        setColors(fetchedColors);

      } catch (err) {
        setError(err.message);
        toast.error(`Error: ${err.message}`);
      } 
    };

    fetchWasteDistribution();
  }, []);

  // Handle error or empty data state
  if (error || series.length === 0 || labels.length === 0) {
    return <div>{error || "No waste distribution data available"}</div>;
  }

  const activeIndex = hoveredIndex !== null ? hoveredIndex : defaultIndex;

  const options = {
    chart: {
      type: 'donut',
      height: 350,
      events: {
        dataPointMouseEnter: (event, chartContext, config) => {
          setHoveredIndex(config.dataPointIndex);
        },
        dataPointMouseLeave: () => {
          setHoveredIndex(null);
        }
      }
    },
    labels: labels,
    colors: colors,
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: { show: false }
        }
      },
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: {
            width: '100%',
            height: 250,
          }
        }
      }
    ]
  };

  return (
    <div className="pie-chart-container">
      <div className="donut-chart-wrapper">
        <Chart options={options} series={series} type="donut" width="100%" height="100%" />
        <div className="center-label">
          <div>{labels[activeIndex] || "N/A"}</div>
          <div>{series[activeIndex] ? `${series[activeIndex].toFixed(2)} Tons` : "0K"}</div>
        </div>
      </div>

      <div className="custom-legend">
        {labels.map((label, index) => (
          <div
            key={label}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`legend-item ${hoveredIndex === index ? 'bold' : ''}`}
          >
            <span
              className="legend-color-box"
              style={{ backgroundColor: colors[index] }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WasteDistribution;