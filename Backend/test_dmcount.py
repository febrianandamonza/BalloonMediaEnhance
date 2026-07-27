from services.density_counter import DensityCounter

counter = DensityCounter()

counter.load_model()

result = counter.predict_image(
    "input/images-crowd.png",
    "output/test_heatmap.jpg"
)

print(result)