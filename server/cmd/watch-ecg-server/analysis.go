package main

import (
	"math"
)

func buildWaveformFeatureSummary(record watchEcgRecord) waveformFeatureSummary {
	waveform := record.Waveform
	if len(waveform) == 0 {
		return waveformFeatureSummary{
			PointCount:      0,
			SampleRate:      record.SampleRate,
			DurationSeconds: record.Duration,
		}
	}

	minValue := waveform[0]
	maxValue := waveform[0]
	sum := 0.0

	for _, point := range waveform {
		if point < minValue {
			minValue = point
		}
		if point > maxValue {
			maxValue = point
		}
		sum += point
	}

	mean := sum / float64(len(waveform))
	varianceSum := 0.0
	for _, point := range waveform {
		diff := point - mean
		varianceSum += diff * diff
	}

	stdDev := math.Sqrt(varianceSum / float64(len(waveform)))
	rPeaks := detectRPeaks(waveform, record.SampleRate)
	rrIntervals := buildRRIntervals(rPeaks, record.SampleRate)
	rrMean := meanOfFloatSlice(rrIntervals)
	rrStd := stdDevOfFloatSlice(rrIntervals, rrMean)
	estimatedHR := 0.0
	if rrMean > 0 {
		estimatedHR = 60000 / rrMean
	}

	return waveformFeatureSummary{
		PointCount:       len(waveform),
		SampleRate:       record.SampleRate,
		DurationSeconds:  roundFloat(record.Duration, 3),
		Min:              roundFloat(minValue, 6),
		Max:              roundFloat(maxValue, 6),
		Mean:             roundFloat(mean, 6),
		StdDev:           roundFloat(stdDev, 6),
		AmplitudeRange:   roundFloat(maxValue-minValue, 6),
		EstimatedHR:      roundFloat(estimatedHR, 1),
		RPeakCount:       len(rPeaks),
		RPeakPositionsMs: buildPeakPositionsMs(rPeaks, record.SampleRate),
		RRIntervalsMs:    truncateFloatSlice(rrIntervals, 16),
		RRMeanMs:         roundFloat(rrMean, 1),
		RRStdMs:          roundFloat(rrStd, 1),
		WaveformPreview:  downsampleWaveform(record.Waveform, defaultWaveformPreviewSize),
	}
}

func detectRPeaks(waveform []float64, sampleRate int) []int {
	if len(waveform) < 3 || sampleRate <= 0 {
		return nil
	}

	mean := meanOfFloatSlice(waveform)
	centered := make([]float64, len(waveform))
	maxPositive := 0.0
	sumSquares := 0.0

	for index, point := range waveform {
		value := point - mean
		centered[index] = value
		if value > maxPositive {
			maxPositive = value
		}
		sumSquares += value * value
	}

	stdDev := math.Sqrt(sumSquares / float64(len(centered)))
	if maxPositive <= 0 || stdDev <= 0 {
		return nil
	}

	threshold := math.Max(maxPositive*0.45, stdDev*1.2)
	minDistance := maxInt(1, int(float64(sampleRate)*0.22))
	peaks := make([]int, 0, 16)

	for index := 1; index < len(centered)-1; index++ {
		value := centered[index]
		if value < threshold {
			continue
		}
		if value < centered[index-1] || value < centered[index+1] {
			continue
		}

		if len(peaks) == 0 {
			peaks = append(peaks, index)
			continue
		}

		lastPeakIndex := peaks[len(peaks)-1]
		if index-lastPeakIndex < minDistance {
			if centered[index] > centered[lastPeakIndex] {
				peaks[len(peaks)-1] = index
			}
			continue
		}

		peaks = append(peaks, index)
	}

	return peaks
}

func buildRRIntervals(peaks []int, sampleRate int) []float64 {
	if len(peaks) < 2 || sampleRate <= 0 {
		return nil
	}

	intervals := make([]float64, 0, len(peaks)-1)
	for index := 1; index < len(peaks); index++ {
		rrMs := float64(peaks[index]-peaks[index-1]) * 1000 / float64(sampleRate)
		if rrMs > 0 {
			intervals = append(intervals, roundFloat(rrMs, 1))
		}
	}

	return intervals
}

func buildPeakPositionsMs(peaks []int, sampleRate int) []float64 {
	if len(peaks) == 0 || sampleRate <= 0 {
		return nil
	}

	positions := make([]float64, 0, len(peaks))
	for _, peak := range peaks {
		positions = append(positions, roundFloat(float64(peak)*1000/float64(sampleRate), 1))
	}

	return truncateFloatSlice(positions, 16)
}

func downsampleWaveform(waveform []float64, targetSize int) []float64 {
	if len(waveform) == 0 {
		return nil
	}
	if targetSize <= 0 || len(waveform) <= targetSize {
		return truncateFloatSlice(waveform, len(waveform))
	}

	preview := make([]float64, 0, targetSize)
	step := float64(len(waveform)-1) / float64(targetSize-1)

	for index := 0; index < targetSize; index++ {
		sampleIndex := int(math.Round(float64(index) * step))
		if sampleIndex < 0 {
			sampleIndex = 0
		}
		if sampleIndex >= len(waveform) {
			sampleIndex = len(waveform) - 1
		}

		preview = append(preview, roundFloat(waveform[sampleIndex], 6))
	}

	return preview
}
