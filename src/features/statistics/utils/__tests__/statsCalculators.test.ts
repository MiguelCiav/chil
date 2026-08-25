import { describe, it, expect } from 'vitest';
import {
  calculateKpiMetrics,
  calculateMonthlyTrends,
  calculateRecognitionRankings,
  calculateDemographics,
  calculateGeographicBreakdown,
  calculateStatusBreakdown,
  buildStatisticsDataset
} from '../statsCalculators';
import { Batch, ScoutMember, Region, District } from '../../../batches/types';
import { RecognitionTypeInfo } from '../../../batches/api';

describe('statsCalculators', () => {
  const mockBatches: Batch[] = [
    {
      id: 1,
      comment: 'Lote Scouts Grupo 1',
      region_id: 10,
      district_id: 100,
      group_id: 1000,
      recognition_type: 'sct-wood-badge',
      created_at: '2026-03-15T10:00:00.000Z'
    },
    {
      id: 2,
      comment: 'Lote Scouts Grupo 2',
      region_id: 10,
      district_id: 101,
      group_id: 1001,
      recognition_type: 'sct-promesa',
      created_at: '2026-05-20T12:00:00.000Z'
    },
    {
      id: 3,
      comment: 'Lote Scouts Grupo 3',
      region_id: 20,
      district_id: 200,
      group_id: 2000,
      recognition_type: 'sct-wood-badge',
      created_at: '2026-05-25T14:00:00.000Z'
    }
  ];

  const mockMembers: ScoutMember[] = [
    {
      identity: 'V-1001',
      first_names: 'Carlos',
      last_names: 'Perez',
      birth_date: '2010-01-01',
      member_type: 'young',
      status: 'active',
      batch_id: 1
    },
    {
      identity: 'V-1002',
      first_names: 'Maria',
      last_names: 'Gomez',
      birth_date: '2012-05-10',
      member_type: 'young',
      status: 'active',
      batch_id: 1
    },
    {
      identity: 'V-1003',
      first_names: 'Pedro',
      last_names: 'Lopez',
      birth_date: '1985-04-12',
      member_type: 'adult',
      status: 'exceptional',
      batch_id: 2
    },
    {
      identity: 'V-1004',
      first_names: 'Ana',
      last_names: 'Silva',
      birth_date: '2011-09-20',
      member_type: 'young',
      status: 'pending',
      batch_id: 3
    }
  ];

  const mockRegions: Region[] = [
    { id: 10, name: 'Región Capital' },
    { id: 20, name: 'Región Central' }
  ];

  const mockDistricts: District[] = [
    { id: 100, name: 'Distrito Sucre', region_id: 10 },
    { id: 101, name: 'Distrito Chacao', region_id: 10 },
    { id: 200, name: 'Distrito Valencia', region_id: 20 }
  ];

  const mockRecTypes: RecognitionTypeInfo[] = [
    { id: 'sct-wood-badge', name: 'Insignia de Madera' },
    { id: 'sct-promesa', name: 'Promesa Scout' }
  ];

  describe('calculateKpiMetrics', () => {
    it('calculates accurate KPI metrics from dataset', () => {
      const kpis = calculateKpiMetrics(mockMembers, mockBatches);

      expect(kpis.totalMembers).toBe(4);
      expect(kpis.totalBatches).toBe(3);
      expect(kpis.totalDiplomas).toBe(3); // 2 active + 1 exceptional
      expect(kpis.avgMembersPerBatch).toBe(1.3); // 4 / 3 = 1.333 -> 1.3
      expect(kpis.youngCount).toBe(3);
      expect(kpis.adultCount).toBe(1);
      expect(kpis.youngPercentage).toBe(75);
      expect(kpis.adultPercentage).toBe(25);
      expect(kpis.activeRegionsCount).toBe(2); // regions 10 and 20
      expect(kpis.activeDistrictsCount).toBe(3); // districts 100, 101, 200
      expect(kpis.activeGroupsCount).toBe(3);
      expect(kpis.activeCount).toBe(2);
      expect(kpis.exceptionalCount).toBe(1);
      expect(kpis.pendingCount).toBe(1);
      expect(kpis.validationRate).toBe(50); // 2 / 4 = 50%
      expect(kpis.exceptionalRate).toBe(25); // 1 / 4 = 25%
      expect(kpis.pendingRate).toBe(25); // 1 / 4 = 25%
    });

    it('handles empty data safely without division by zero errors', () => {
      const kpis = calculateKpiMetrics([], []);

      expect(kpis.totalMembers).toBe(0);
      expect(kpis.totalBatches).toBe(0);
      expect(kpis.totalDiplomas).toBe(0);
      expect(kpis.avgMembersPerBatch).toBe(0);
      expect(kpis.youngCount).toBe(0);
      expect(kpis.adultCount).toBe(0);
      expect(kpis.youngPercentage).toBe(0);
      expect(kpis.adultPercentage).toBe(0);
      expect(kpis.validationRate).toBe(0);
      expect(kpis.exceptionalRate).toBe(0);
      expect(kpis.pendingRate).toBe(0);
    });
  });

  describe('calculateMonthlyTrends', () => {
    it('returns 12 months for target year with aggregated counts', () => {
      const trends = calculateMonthlyTrends(mockMembers, mockBatches, 2026);

      expect(trends).toHaveLength(12);
      expect(trends[0].label).toBe('Ene');
      expect(trends[2].label).toBe('Mar');
      expect(trends[2].totalCount).toBe(2); // Batch 1 in March has 2 members
      expect(trends[2].activeCount).toBe(2);
      expect(trends[4].label).toBe('May');
      expect(trends[4].totalCount).toBe(2); // Batch 2 and 3 in May have 1 member each
      expect(trends[4].exceptionalCount).toBe(1);
      expect(trends[4].pendingCount).toBe(1);
      expect(trends[11].label).toBe('Dic');
      expect(trends[11].totalCount).toBe(0);
    });

    it('infers year from batches if targetYear is not provided', () => {
      const trends = calculateMonthlyTrends(mockMembers, mockBatches);

      expect(trends).toHaveLength(12);
      expect(trends[0].year).toBe(2026);
    });

    it('handles empty data with default current year', () => {
      const trends = calculateMonthlyTrends([], []);

      expect(trends).toHaveLength(12);
      trends.forEach(m => {
        expect(m.totalCount).toBe(0);
        expect(m.activeCount).toBe(0);
        expect(m.exceptionalCount).toBe(0);
        expect(m.pendingCount).toBe(0);
      });
    });
  });

  describe('calculateRecognitionRankings', () => {
    it('ranks recognitions descending by count and applies badge styling', () => {
      const rankings = calculateRecognitionRankings(mockMembers, mockBatches, mockRecTypes);

      expect(rankings).toHaveLength(2);
      // Wood Badge has 3 members (2 from batch 1 + 1 from batch 3)
      expect(rankings[0].id).toBe('sct-wood-badge');
      expect(rankings[0].name).toBe('Insignia de Madera');
      expect(rankings[0].count).toBe(3);
      expect(rankings[0].percentage).toBe(75); // 3 / 4 = 75%
      expect(rankings[0].badgeStyle).toBeDefined();

      // Promesa has 1 member (batch 2)
      expect(rankings[1].id).toBe('sct-promesa');
      expect(rankings[1].name).toBe('Promesa Scout');
      expect(rankings[1].count).toBe(1);
      expect(rankings[1].percentage).toBe(25); // 1 / 4 = 25%
    });

    it('handles empty recognitions safely', () => {
      const rankings = calculateRecognitionRankings([], []);
      expect(rankings).toEqual([]);
    });
  });

  describe('calculateDemographics', () => {
    it('computes young vs adult counts and sub-status breakdown', () => {
      const demo = calculateDemographics(mockMembers);

      expect(demo.totalCount).toBe(4);
      expect(demo.youngCount).toBe(3);
      expect(demo.adultCount).toBe(1);
      expect(demo.youngPercentage).toBe(75);
      expect(demo.adultPercentage).toBe(25);
      expect(demo.youngActive).toBe(2);
      expect(demo.youngExceptional).toBe(0);
      expect(demo.youngPending).toBe(1);
      expect(demo.adultActive).toBe(0);
      expect(demo.adultExceptional).toBe(1);
      expect(demo.adultPending).toBe(0);
    });

    it('handles zero members without error', () => {
      const demo = calculateDemographics([]);
      expect(demo.totalCount).toBe(0);
      expect(demo.youngPercentage).toBe(0);
      expect(demo.adultPercentage).toBe(0);
    });
  });

  describe('calculateGeographicBreakdown', () => {
    it('aggregates counts by region and district', () => {
      const geo = calculateGeographicBreakdown(mockBatches, mockMembers, mockRegions, mockDistricts);

      expect(geo.regions).toHaveLength(2);
      // Región Capital (id 10) has 3 members (2 from batch 1 + 1 from batch 2)
      expect(geo.regions[0].id).toBe(10);
      expect(geo.regions[0].name).toBe('Región Capital');
      expect(geo.regions[0].count).toBe(3);
      expect(geo.regions[0].percentage).toBe(75);

      // Región Central (id 20) has 1 member (batch 3)
      expect(geo.regions[1].id).toBe(20);
      expect(geo.regions[1].name).toBe('Región Central');
      expect(geo.regions[1].count).toBe(1);
      expect(geo.regions[1].percentage).toBe(25);

      expect(geo.districts).toHaveLength(3);
      expect(geo.districts[0].name).toBe('Distrito Sucre');
      expect(geo.districts[0].parentName).toBe('Región Capital');
      expect(geo.districts[0].count).toBe(2);
    });

    it('handles empty lists gracefully', () => {
      const geo = calculateGeographicBreakdown([], [], [], []);
      expect(geo.regions).toEqual([]);
      expect(geo.districts).toEqual([]);
    });
  });

  describe('calculateStatusBreakdown', () => {
    it('calculates accurate status percentages', () => {
      const status = calculateStatusBreakdown(mockMembers);

      expect(status.totalCount).toBe(4);
      expect(status.activeCount).toBe(2);
      expect(status.exceptionalCount).toBe(1);
      expect(status.pendingCount).toBe(1);
      expect(status.activePercentage).toBe(50);
      expect(status.exceptionalPercentage).toBe(25);
      expect(status.pendingPercentage).toBe(25);
    });

    it('handles zero members safely', () => {
      const status = calculateStatusBreakdown([]);
      expect(status.totalCount).toBe(0);
      expect(status.activePercentage).toBe(0);
      expect(status.exceptionalPercentage).toBe(0);
      expect(status.pendingPercentage).toBe(0);
    });
  });

  describe('buildStatisticsDataset', () => {
    it('builds a consolidated statistics dataset object', () => {
      const dataset = buildStatisticsDataset(
        mockMembers,
        mockBatches,
        mockRegions,
        mockDistricts,
        mockRecTypes
      );

      expect(dataset.kpis.totalMembers).toBe(4);
      expect(dataset.monthlyTrends).toHaveLength(12);
      expect(dataset.recognitionRankings).toHaveLength(2);
      expect(dataset.demographics.youngCount).toBe(3);
      expect(dataset.geographic.regions).toHaveLength(2);
      expect(dataset.statusBreakdown.activeCount).toBe(2);
      expect(dataset.filteredMembersCount).toBe(4);
      expect(dataset.filteredBatchesCount).toBe(3);
    });
  });
});
