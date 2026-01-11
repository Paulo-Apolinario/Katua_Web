import { useState } from "react";
import Chart from 'react-apexcharts';

const VehicleStatusChart = ({series}) => {
  const defaultIndex = 1; 
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const labels = ['Maintenance', 'Active', 'Out of Service'];
  const colors = ['#EAB308', '#32D584', '#EF4444'];

  const options = {
    chart: {
      type: 'donut',
      width: '100%',
      height: 250,
      toolbar: { show: false },
      events: {
        dataPointMouseEnter: (event, chartContext, config) => {
          setHoveredIndex(config.dataPointIndex);
        },
        dataPointMouseLeave: () => {
          setHoveredIndex(null);
        }
      }
    },
    labels,
    colors,
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { enabled: false },
    plotOptions: {
      pie: {
        expandOnClick: false,
        donut: {
          size: '75%',
          labels: { show: false }
        }
      }
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

  const activeIndex = hoveredIndex !== null ? hoveredIndex : defaultIndex;

  return (
    <div className="pie-chart-container pie-sm">
      {/* Chart Area */}
      <div className="donut-chart-wrapper">
        <Chart options={options} series={series} type="donut" width="100%" height="100%" />

        {/* Center Label */}
        <div className="center-label">
          <div>{labels[activeIndex]}</div>
          <div>{series[activeIndex]}</div>
        </div>
      </div>

      {/* Legend */}
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

export default VehicleStatusChart;