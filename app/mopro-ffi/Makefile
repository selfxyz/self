TARGETS = x86_64-apple-ios aarch64-apple-ios aarch64-apple-ios-sim
BUILD_TYPES = debug release

all: $(BUILD_TYPES)

debug: $(TARGETS)
	for target in $(TARGETS); do \
		cargo build --target $$target; \
	done

release:
	for target in $(TARGETS); do \
		cargo build --release --target $$target; \
	done

.PHONY: all $(BUILD_TYPES) $(TARGETS)