import { AfterActionReport, User } from '@/types/session'

export const mockReport: AfterActionReport = {
  session: {
    id: 'session-001',
    userId: 'user-123',
    startTime: new Date('2025-10-03T14:30:00'),
    endTime: new Date('2025-10-03T14:45:30'),
    steps: [
      {
        id: 'step-1',
        timestamp: new Date('2025-10-03T14:30:00'),
        action: 'Session Started',
        description: 'CPR training session initiated. Victim assessment completed.',
        performance: {
          handPosition: 'correct'
        }
      },
      {
        id: 'step-2',
        timestamp: new Date('2025-10-03T14:30:30'),
        action: 'First Compression Cycle',
        description: 'Started chest compressions with proper hand placement on the lower half of the sternum.',
        performance: {
          compressionRate: 105,
          compressionDepth: 5.5,
          handPosition: 'correct'
        }
      },
      {
        id: 'step-3',
        timestamp: new Date('2025-10-03T14:31:00'),
        action: 'Compression Adjustment',
        description: 'Continued compressions with consistent rhythm and depth.',
        corrections: [
          {
            id: 'corr-1',
            timestamp: new Date('2025-10-03T14:31:15'),
            type: 'hand_position',
            description: 'Hands shifted off center - moved 2cm to the left of sternum',
            compressionCount: 12,
            severity: 'moderate'
          }
        ],
        performance: {
          compressionRate: 98,
          compressionDepth: 5.2,
          handPosition: 'off-center'
        }
      },
      {
        id: 'step-4',
        timestamp: new Date('2025-10-03T14:32:00'),
        action: 'Rescue Breaths',
        description: 'Delivered 2 rescue breaths with proper head tilt and chin lift.',
        performance: {
          breathsDelivered: 2
        }
      },
      {
        id: 'step-5',
        timestamp: new Date('2025-10-03T14:32:30'),
        action: 'Second Compression Cycle',
        description: 'Resumed chest compressions after rescue breaths.',
        corrections: [
          {
            id: 'corr-2',
            timestamp: new Date('2025-10-03T14:32:45'),
            type: 'compression_rate',
            description: 'Compression rate too slow - dropped to 85 CPM',
            duration: 15,
            severity: 'minor'
          }
        ],
        performance: {
          compressionRate: 85,
          compressionDepth: 5.8,
          handPosition: 'correct'
        }
      },
      {
        id: 'step-6',
        timestamp: new Date('2025-10-03T14:33:30'),
        action: 'Rate Correction',
        description: 'Adjusted compression rate to optimal range.',
        performance: {
          compressionRate: 110,
          compressionDepth: 5.6,
          handPosition: 'correct'
        }
      },
      {
        id: 'step-7',
        timestamp: new Date('2025-10-03T14:34:30'),
        action: 'Third Compression Cycle',
        description: 'Maintained consistent compressions with proper technique.',
        performance: {
          compressionRate: 108,
          compressionDepth: 5.4,
          handPosition: 'correct'
        }
      },
      {
        id: 'step-8',
        timestamp: new Date('2025-10-03T14:35:30'),
        action: 'Rescue Breaths',
        description: 'Delivered 2 rescue breaths maintaining proper seal.',
        performance: {
          breathsDelivered: 2
        }
      },
      {
        id: 'step-9',
        timestamp: new Date('2025-10-03T14:36:00'),
        action: 'Fourth Compression Cycle',
        description: 'Continued high-quality chest compressions.',
        corrections: [
          {
            id: 'corr-3',
            timestamp: new Date('2025-10-03T14:36:30'),
            type: 'compression_depth',
            description: 'Compressions too shallow - only 4.2cm depth',
            compressionCount: 8,
            severity: 'critical'
          }
        ],
        performance: {
          compressionRate: 112,
          compressionDepth: 4.2,
          handPosition: 'correct'
        }
      },
      {
        id: 'step-10',
        timestamp: new Date('2025-10-03T14:37:00'),
        action: 'Depth Adjustment',
        description: 'Corrected compression depth to optimal range.',
        performance: {
          compressionRate: 106,
          compressionDepth: 5.5,
          handPosition: 'correct'
        }
      },
      {
        id: 'step-11',
        timestamp: new Date('2025-10-03T14:45:00'),
        action: 'Session Completed',
        description: 'Successfully completed 5 full CPR cycles with overall good performance.',
        performance: {
          compressionRate: 105,
          compressionDepth: 5.4,
          handPosition: 'correct'
        }
      }
    ],
    totalCompressions: 150,
    totalBreaths: 10,
    avgCompressionRate: 104,
    avgCompressionDepth: 5.3,
    overallScore: 82,
    status: 'completed',
    certification: {
      passed: true,
      score: 82,
      certificateId: 'CERT-2025-001234'
    }
  },
  summary: {
    totalDuration: 930000, // 15.5 minutes in milliseconds
    totalCorrections: 3,
    criticalErrors: 1,
    performanceScore: 82,
    strengths: [
      'Maintained proper hand position for majority of session',
      'Successfully completed all 5 CPR cycles',
      'Good recovery from corrections - quickly adjusted technique',
      'Proper rescue breath technique with adequate seal'
    ],
    areasForImprovement: [
      'Monitor compression depth more consistently to avoid shallow compressions',
      'Maintain steady compression rate - avoid dropping below 100 CPM',
      'Focus on keeping hands centered on sternum throughout entire session'
    ]
  },
  timeline: [
    {
      id: 'step-1',
      timestamp: new Date('2025-10-03T14:30:00'),
      action: 'Session Started',
      description: 'CPR training session initiated. Victim assessment completed.',
      performance: {
        handPosition: 'correct'
      }
    },
    {
      id: 'step-2',
      timestamp: new Date('2025-10-03T14:30:30'),
      action: 'First Compression Cycle',
      description: 'Started chest compressions with proper hand placement on the lower half of the sternum.',
      performance: {
        compressionRate: 105,
        compressionDepth: 5.5,
        handPosition: 'correct'
      }
    },
    {
      id: 'step-3',
      timestamp: new Date('2025-10-03T14:31:00'),
      action: 'Compression Adjustment',
      description: 'Continued compressions with consistent rhythm and depth.',
      corrections: [
        {
          id: 'corr-1',
          timestamp: new Date('2025-10-03T14:31:15'),
          type: 'hand_position',
          description: 'Hands shifted off center - moved 2cm to the left of sternum',
          compressionCount: 12,
          severity: 'moderate'
        }
      ],
      performance: {
        compressionRate: 98,
        compressionDepth: 5.2,
        handPosition: 'off-center'
      }
    },
    {
      id: 'step-4',
      timestamp: new Date('2025-10-03T14:32:00'),
      action: 'Rescue Breaths',
      description: 'Delivered 2 rescue breaths with proper head tilt and chin lift.',
      performance: {
        breathsDelivered: 2
      }
    },
    {
      id: 'step-5',
      timestamp: new Date('2025-10-03T14:32:30'),
      action: 'Second Compression Cycle',
      description: 'Resumed chest compressions after rescue breaths.',
      corrections: [
        {
          id: 'corr-2',
          timestamp: new Date('2025-10-03T14:32:45'),
          type: 'compression_rate',
          description: 'Compression rate too slow - dropped to 85 CPM',
          duration: 15,
          severity: 'minor'
        }
      ],
      performance: {
        compressionRate: 85,
        compressionDepth: 5.8,
        handPosition: 'correct'
      }
    },
    {
      id: 'step-6',
      timestamp: new Date('2025-10-03T14:33:30'),
      action: 'Rate Correction',
      description: 'Adjusted compression rate to optimal range.',
      performance: {
        compressionRate: 110,
        compressionDepth: 5.6,
        handPosition: 'correct'
      }
    },
    {
      id: 'step-7',
      timestamp: new Date('2025-10-03T14:34:30'),
      action: 'Third Compression Cycle',
      description: 'Maintained consistent compressions with proper technique.',
      performance: {
        compressionRate: 108,
        compressionDepth: 5.4,
        handPosition: 'correct'
      }
    },
    {
      id: 'step-8',
      timestamp: new Date('2025-10-03T14:35:30'),
      action: 'Rescue Breaths',
      description: 'Delivered 2 rescue breaths maintaining proper seal.',
      performance: {
        breathsDelivered: 2
      }
    },
    {
      id: 'step-9',
      timestamp: new Date('2025-10-03T14:36:00'),
      action: 'Fourth Compression Cycle',
      description: 'Continued high-quality chest compressions.',
      corrections: [
        {
          id: 'corr-3',
          timestamp: new Date('2025-10-03T14:36:30'),
          type: 'compression_depth',
          description: 'Compressions too shallow - only 4.2cm depth',
          compressionCount: 8,
          severity: 'critical'
        }
      ],
      performance: {
        compressionRate: 112,
        compressionDepth: 4.2,
        handPosition: 'correct'
      }
    },
    {
      id: 'step-10',
      timestamp: new Date('2025-10-03T14:37:00'),
      action: 'Depth Adjustment',
      description: 'Corrected compression depth to optimal range.',
      performance: {
        compressionRate: 106,
        compressionDepth: 5.5,
        handPosition: 'correct'
      }
    },
    {
      id: 'step-11',
      timestamp: new Date('2025-10-03T14:45:00'),
      action: 'Session Completed',
      description: 'Successfully completed 5 full CPR cycles with overall good performance.',
      performance: {
        compressionRate: 105,
        compressionDepth: 5.4,
        handPosition: 'correct'
      }
    }
  ],
  recommendations: [
    'Practice maintaining consistent compression depth using a CPR feedback device',
    'Use a metronome or audio guide to maintain steady 100-120 CPM rate',
    'Focus on hand positioning drills to prevent drift during extended sessions',
    'Review video tutorials on proper chest recoil technique',
    'Schedule follow-up session to reinforce proper compression depth'
  ],
  generatedAt: new Date()
}

export const mockUser: User = {
  id: 'user-123',
  name: 'Arnold Aldridge',
  email: 'arnold.aldridge@example.com',
  phone: '+1 (555) 123-4567',
  emergencyContact: {
    name: 'Sarah Aldridge',
    email: 'sarah.aldridge@example.com',
    phone: '+1 (555) 987-6543',
    relationship: 'Wife'
  },
  organization: 'Metro Emergency Services',
  role: 'Paramedic',
  rating: 4.9,
  isCprCertified: true,
  certificationExpiry: new Date('2026-03-15'),
  trainingHistory: {
    totalSessions: 47,
    lastSession: new Date('2025-01-15T14:30:00'),
    averageScore: 87
  },
  preferences: {
    emailNotifications: true,
    smsNotifications: false,
    language: 'en',
    theme: 'dark',
    metronomeEnabled: true,
    voiceCoaching: true
  },
  createdAt: new Date('2023-06-15T10:00:00'),
  updatedAt: new Date('2025-01-15T14:30:00')
}