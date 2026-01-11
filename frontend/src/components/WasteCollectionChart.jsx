import { useState,useEffect, useRef } from 'react';
import Chart from 'react-apexcharts';
import toast from 'react-hot-toast';

const WasteCollectionChart = ({ isSidebarOpen }) => {
  const containerRef = useRef(null);
  const [series, setSeries] = useState([{ name: 'Waste Collected', data: [] }]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('auth_token');

  // Fetch waste collection trends data on component mount
  useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/waste-collection-trends`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          'Authorization': `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch waste collection trends");
      }

      const result = await response.json();

      // Flatten and aggregate by month
      const monthMap = {};

      result.data.forEach(item => {
        item.monthly_trend.forEach(entry => {
          const month = entry.month;
          const quantity = parseFloat(entry.quantity) || 0;

          if (!monthMap[month]) {
            monthMap[month] = quantity;
          } else {
            monthMap[month] += quantity;
          }
        });
      });

      const sortedMonths = Object.keys(monthMap).sort(); 
      const quantities = sortedMonths.map(month => monthMap[month]);

      setCategories(sortedMonths);
      setSeries([{ name: 'Waste Collected', data: quantities }]);

    } catch (err) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);

  // Handle chart resize when sidebar toggles
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      window.dispatchEvent(new Event('resize'));
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isSidebarOpen]);

  const options = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: {
        show: false,
      },
    },
    dataLabels: {
    enabled: true, 
    formatter: function (val) {
      return `${val.toFixed(2)}`;
    },
  },
    xaxis: {
      categories,
    },
    yaxis: {
      labels: {
        formatter: function (value) {
          return `${Math.round(value)}kg`;
        }
      }
    },
    colors: ['#1A7E00'],
    fill: {
      type: 'gradient',
      gradient: {
        type: 'vertical',
        opacityFrom: 0.3,
        opacityTo: 0.1,
        stops: [0, 100],
      }
    },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return `${val.toFixed(2)} kg`;
        }
      }
    }
  };

  return (
    <div ref={containerRef}>
      <Chart
        options={options}
        series={series}
        type="area"
        height={350}
      />
    </div>
  );
};

export default WasteCollectionChart;
