import React, { createContext, useContext, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Modal } from './Modal.js';
import { Button } from './Button.js';
import { ConfirmModal } from './ConfirmModal.js';

export interface StepWizardStepItem {
  id: number | string;
  label: string;
  description?: string;
}

export interface StepWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: StepWizardStepItem[];
  currentStep: number;
  onStepChange?: (step: number) => void;
  maxWidth?: string;
  maxHeight?: string;
  errorMsg?: string | null;
  isDirty?: boolean;
  canContinue?: boolean;
  continueDisabled?: boolean;
  submitDisabled?: boolean;
  continueLabel?: string;
  backLabel?: string;
  cancelLabel?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
  allowStepClick?: boolean;
  showCancelOnAllSteps?: boolean;
  hideBack?: boolean;
  hideFooter?: boolean;
  onContinue?: () => boolean | void | Promise<boolean | void>;
  onBack?: () => void;
  onSubmit?: (e?: React.FormEvent) => void | Promise<void>;
  discardTitle?: string;
  discardMessage?: React.ReactNode;
  discardConfirmLabel?: string;
  children: React.ReactNode;
}

interface WizardContextValue {
  currentStep: number;
}

const WizardContext = createContext<WizardContextValue>({ currentStep: 1 });

export interface StepWizardStepProps {
  step: number;
  children: React.ReactNode;
  className?: string;
}

export const StepWizardStep: React.FC<StepWizardStepProps> = ({
  step,
  children,
  className = '',
}) => {
  const { currentStep } = useContext(WizardContext);
  if (step !== currentStep) return null;

  return (
    <div className={`wizard-step-content ${className}`.trim()}>
      {children}
    </div>
  );
};

const StepWizardModalRoot: React.FC<StepWizardModalProps> = ({
  isOpen,
  onClose,
  title,
  steps,
  currentStep,
  onStepChange,
  maxWidth = '860px',
  maxHeight = '72vh',
  errorMsg,
  isDirty = false,
  canContinue = true,
  continueDisabled = false,
  submitDisabled = false,
  continueLabel = 'Continue',
  backLabel = 'Back',
  cancelLabel = 'Cancel',
  submitLabel = 'Submit',
  isSubmitting = false,
  allowStepClick = false,
  showCancelOnAllSteps = false,
  hideBack = false,
  hideFooter = false,
  onContinue,
  onBack,
  onSubmit,
  discardTitle = 'Discard Unsaved Changes?',
  discardMessage = 'You have unsaved changes. Are you sure you want to discard them?',
  discardConfirmLabel = 'Discard Changes',
  children,
}) => {
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const totalSteps = steps.length;
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleContinue = async () => {
    if (onContinue) {
      const res = await onContinue();
      if (res === false) return;
    }
    if (onStepChange && currentStep < totalSteps) {
      onStepChange(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onStepChange && currentStep > 1) {
      onStepChange(currentStep - 1);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLastStep) {
      if (onSubmit) {
        await onSubmit(e);
      }
    } else {
      await handleContinue();
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleRequestClose} title={title} maxWidth={maxWidth}>
        <form onSubmit={handleFormSubmit} className="wizard-form">
          <div className="modal-body wizard-modal-body" style={{ maxHeight }}>
            {/* Stepper Navigation */}
            <div className="wizard-stepper">
              {steps.map((item, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === currentStep;
                const isCompleted = stepNumber < currentStep;
                const isClickable = allowStepClick && (isCompleted || isActive);

                return (
                  <React.Fragment key={item.id ?? index}>
                    <div
                      className={`wizard-step ${isActive ? 'wizard-step-active' : ''} ${
                        isCompleted ? 'wizard-step-completed' : ''
                      } ${isClickable ? 'wizard-step-clickable' : ''}`.trim()}
                      onClick={() => {
                        if (isClickable && onStepChange) {
                          onStepChange(stepNumber);
                        }
                      }}
                    >
                      <div className="wizard-step-circle">
                        {isCompleted ? <Check size={13} strokeWidth={2.5} /> : stepNumber}
                      </div>
                      <div className="wizard-step-label">
                        <span className="wizard-step-title">{item.label}</span>
                        {item.description && (
                          <span className="wizard-step-desc">{item.description}</span>
                        )}
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`wizard-step-connector ${
                          stepNumber < currentStep ? 'wizard-step-connector-active' : ''
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Error Message Box */}
            {errorMsg && (
              <div className="alert-error" style={{ marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            {/* Current Step Content */}
            <WizardContext.Provider value={{ currentStep }}>
              {children}
            </WizardContext.Provider>
          </div>

          {/* Modal Footer with Dynamic Wizard Navigation */}
          {!hideFooter && (
            <div className="modal-footer wizard-modal-footer">
              <div className="wizard-footer-left">
                {isFirstStep || hideBack ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleRequestClose}
                    disabled={isSubmitting}
                  >
                    {cancelLabel}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="wizard-btn-icon"
                  >
                    <ArrowLeft size={16} /> {backLabel}
                  </Button>
                )}
              </div>

              <div className="wizard-footer-right">
                {showCancelOnAllSteps && !isFirstStep && !hideBack && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleRequestClose}
                    disabled={isSubmitting}
                  >
                    {cancelLabel}
                  </Button>
                )}

                {!isLastStep ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleContinue}
                    disabled={canContinue === false || continueDisabled || isSubmitting}
                    className="wizard-btn-icon"
                  >
                    {continueLabel} <ArrowRight size={16} />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    disabled={submitDisabled || isSubmitting}
                  >
                    {submitLabel}
                  </Button>
                )}
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Discard Confirmation Modal */}
      <ConfirmModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          onClose();
        }}
        title={discardTitle}
        message={discardMessage}
        confirmLabel={discardConfirmLabel}
        variant="danger"
      />
    </>
  );
};

export const StepWizardModal: React.FC<StepWizardModalProps> & {
  Step: typeof StepWizardStep;
} = Object.assign(StepWizardModalRoot, {
  Step: StepWizardStep,
});

export const Step = StepWizardStep;
