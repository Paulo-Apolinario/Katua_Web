import { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import toast from 'react-hot-toast';

const WasteTypeChart = () => {
  const [series, setSeries] = useState([{ data: [] }]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('auth_token');

  // Fetch waste type distribution data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {

        // Fetch waste type distribution
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/waste-type-distribution`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
           'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch waste type distribution");
        }

        const result = await response.json();
        setSeries([{ data: result.data.map(item => item.total_quantity) }]);
        setCategories(result.data.map(item => item.waste_type));

      } catch (err) {
        toast.error(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const options = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        tools: {
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false,
          download: false,
        }
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '70%',
        distributed: true,
      },
    },
    colors: ['#1A7E00', '#2DDB00', '#41FF0F', '#69FF42', '#92FF75'],
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories,
      labels: {
        style: {
          colors: '#000',
          fontSize: '14px',
        },
      },
      title: { text: 'Quantity (KG)' },
    },
     tooltip: {
    y: {
      formatter: (val) => `${val} KG`,
      title: {
        formatter: () => ''
      }
    }
  }
  };

  // Render loading or error state
  if (loading) {
    return (
      <div className="waste-collected-chart">
        <div>Loading chart data...</div>
      </div>
    );
  }

  return (
    <div className="waste-collected-chart">
      <Chart options={options} series={series} type="bar" height={350} />
    </div>
  );
};

export default WasteTypeChart;
